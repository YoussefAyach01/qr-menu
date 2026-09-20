# qr-menu ("Tawla")

QR-code menu for restaurants and cafes, with orders sent to the restaurant's WhatsApp. Multi-tenant: each restaurant signs up, builds a menu (FR + optional AR names), prints table cards with QR codes, and diners order from their phone. Orders are composed in the browser and handed to WhatsApp (`wa.me` link), so there is no order database and nothing to install for the diner.

Stack: Next.js 16 (App Router) + Tailwind 4 + TypeScript strict + SQLite via the built-in `node:sqlite` (no native modules, no cloud account).

## Run

Requires Node 22.18+ (developed on Node 25).

```bash
npm install
cp .env.example .env.local     # then edit SESSION_SECRET
npm run seed                   # optional: demo restaurant at /m/demo (demo@example.com / demo-password-1)
npm run dev                    # http://localhost:3110
```

Checks: `npm run typecheck && npm run lint && npm test`.
End-to-end (real Chrome, needs `npm run build` first): `npm run test:e2e`.

## How it is built

- `src/lib/*`: pure logic (money, WhatsApp message, phone normalisation, slugs, scrypt passwords, signed session cookies, rate limiter, SQLite repository). Unit-tested without Next.
- `src/app/actions.ts`: server actions. Each mutating action calls `requireOwner()` and every SQL write is scoped by `restaurant_id` (ownership check, tested against IDOR).
- `src/app/m/[slug]`: public menu + cart (client component, `<dialog>` for the order panel).
- `src/app/api/qr/[slug]`: QR code as SVG, optionally per table (`?t=5`).
- Security: zod validation on every form, parameterised SQL, httpOnly + SameSite=Lax session cookie (Secure in production), login/signup rate limits, same error for unknown user and wrong password, CSP and other headers in `next.config.ts`.

## Deploy

Needs a Node host with a persistent disk (SQLite is a file): a small VPS, Railway or Fly with a volume. It will NOT work on Vercel's serverless filesystem as-is; to use Vercel, swap `src/lib/db.ts` for Postgres/Turso (only `db.ts` and `repo.ts` touch the database).

1. Set env vars from `.env.example` (`SESSION_SECRET` is mandatory in production: the app refuses to start sessions without it).
2. `npm run build && npm start` behind HTTPS (Caddy/nginx). Set `NEXT_PUBLIC_APP_URL` to the public URL: it is what the QR codes encode.
3. Back up `DATABASE_PATH` (it is one file; use `sqlite3 .backup` or copy while idle).
4. Make sure your reverse proxy overwrites `X-Forwarded-For`, otherwise the rate limiter can be bypassed.

## Known limits

- Upgrading to Pro is manual for now: `UPDATE restaurants SET plan='pro' WHERE slug='...'`. Stripe env vars exist but no checkout is wired (a "not configured" message is shown).
- No password reset or e-mail verification (needs an e-mail provider). Sessions last 7 days.
- Rate limiter is in memory (one server process).
- Orders are not stored: the restaurant only sees them in WhatsApp.
- Dashboard is French only; the public menu is French/Arabic.
