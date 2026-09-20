// End-to-end check of the real product flow in a real browser (system Chrome via playwright-core).
// Requires `npm run build` first. Starts its own server on port 3111 with a throwaway database.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const PORT = 3111;
const BASE = `http://localhost:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), 'qr-menu-e2e-'));
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
  env: {
    ...process.env,
    DATABASE_PATH: join(dir, 'e2e.db'),
    SESSION_SECRET: 'e2e-secret-e2e-secret-e2e-secret-1234',
    NEXT_PUBLIC_APP_URL: BASE,
  },
  stdio: 'pipe',
});
let serverLog = '';
server.stdout.on('data', (d) => (serverLog += d));
server.stderr.on('data', (d) => (serverLog += d));

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  ${detail}`}`);
  if (!ok) failures++;
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not start:\n${serverLog}`);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
  const page = await ctx.newPage();

  // Landing
  await page.goto(BASE);
  check('landing shows the headline', (await page.locator('h1').innerText()).includes('carte'));

  // Sign up
  await page.goto(`${BASE}/signup`);
  await page.fill('#restaurantName', 'Café Test');
  await page.fill('#whatsapp', '06 12 34 56 78');
  await page.fill('#email', 'owner@example.com');
  await page.fill('#password', 'a-long-password-1');
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard**');
  check(
    'signup lands on the dashboard with a welcome message',
    (await page.locator('[role=status]').innerText()).includes('Bienvenue'),
  );

  // Duplicate signup is refused with a readable error
  const other = await browser.newContext();
  const p2 = await other.newPage();
  await p2.goto(`${BASE}/signup`);
  await p2.fill('#restaurantName', 'Autre');
  await p2.fill('#whatsapp', '0612345678');
  await p2.fill('#email', 'OWNER@example.com');
  await p2.fill('#password', 'a-long-password-1');
  await p2.click('button[type=submit]');
  await p2.waitForURL('**/signup?error=email_taken');
  check(
    'duplicate e-mail is rejected',
    (await p2.locator('main [role=alert]').innerText()).includes('existe déjà'),
  );

  // Bad login gives one generic message
  await p2.goto(`${BASE}/login`);
  await p2.fill('#email', 'owner@example.com');
  await p2.fill('#password', 'wrong-password-123');
  await p2.click('button[type=submit]');
  await p2.waitForURL('**/login?error=invalid_credentials');
  check(
    'wrong password shows a generic error',
    (await p2.locator('main [role=alert]').innerText()).includes('incorrect'),
  );

  // Dashboard requires a session
  await p2.goto(`${BASE}/dashboard`);
  check('anonymous visitors are redirected from /dashboard to /login', p2.url().endsWith('/login'));
  await other.close();

  // Build a menu
  await page.fill('#cat-name', 'Plats');
  await page.fill('#cat-name-ar', 'الأطباق');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.waitForURL('**/dashboard?msg=category_added');
  await page.getByText('Ajouter un plat à').click();
  await page.locator('#new-name').fill('Tajine');
  await page.locator('#new-price').fill('95');
  await page.getByRole('button', { name: 'Ajouter le plat' }).click();
  await page.waitForURL('**/dashboard?msg=item_added');
  await page.getByText('Ajouter un plat à').click();
  await page.locator('#new-name').fill('Thé');
  await page.locator('#new-price').fill('12,5');
  await page.getByRole('button', { name: 'Ajouter le plat' }).click();
  await page.waitForURL('**/dashboard?msg=item_added');
  await page.getByText('12,50 MAD').waitFor(); // server actions redirect client-side, so wait for the new content
  check(
    'dashboard lists both dishes',
    (await page.locator('main').innerText()).includes('Tajine') &&
      (await page.locator('main').innerText()).includes('12,50'),
  );

  // Invalid price is refused
  await page.getByText('Ajouter un plat à').click();
  await page.locator('#new-name').fill('Bad');
  await page.locator('#new-price').fill('abc');
  await page.getByRole('button', { name: 'Ajouter le plat' }).click();
  await page.waitForURL('**/dashboard?error=invalid_item');
  check(
    'invalid price is rejected',
    (await page.locator('main [role=alert]').innerText()).includes('prix valide'),
  );

  // Public menu, order via WhatsApp
  const menu = await ctx.newPage();
  await menu.goto(`${BASE}/m/cafe-test?t=5`);
  check('menu shows the restaurant', (await menu.locator('h1').innerText()) === 'Café Test');
  check(
    'menu has no horizontal scroll at 375px',
    await menu.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  );
  await menu.getByRole('button', { name: 'Ajouter: Tajine' }).click();
  await menu.getByRole('button', { name: 'Ajouter: Tajine' }).click();
  await menu.getByRole('button', { name: 'Ajouter: Thé' }).click();
  await menu.getByRole('button', { name: /Voir ma commande/ }).click();
  const href = await menu.getByRole('link', { name: 'Envoyer sur WhatsApp' }).getAttribute('href');
  const text = decodeURIComponent(href.split('?text=')[1]);
  check(
    'WhatsApp link targets the normalised number',
    href.startsWith('https://wa.me/212612345678?text='),
    href,
  );
  check(
    'order text has quantities, table and total',
    text.includes('2 x Tajine') && text.includes('Table: 5') && text.includes('Total: 202,50'),
    text,
  );

  // Arabic version
  await menu.goto(`${BASE}/m/cafe-test?lang=ar`);
  check(
    'Arabic menu is RTL with Arabic category name',
    (await menu.locator('div[dir=rtl]').count()) === 1 &&
      (await menu.locator('body').innerText()).includes('الأطباق'),
  );

  // Sold out hides the dish from diners
  await page.goto(`${BASE}/dashboard`);
  await page.getByRole('button', { name: 'Marquer épuisé : Thé' }).click();
  await page.waitForURL('**/dashboard');
  await menu.goto(`${BASE}/m/cafe-test`);
  check(
    'sold-out dish disappears from the public menu',
    !(await menu.locator('body').innerText()).includes('Thé'),
  );

  // Print cards + QR endpoint
  await page.goto(`${BASE}/dashboard/print?tables=3`);
  check('print page renders 3 table cards', (await page.locator('li:has-text("Table ")').count()) === 3);
  const qr = await fetch(`${BASE}/api/qr/cafe-test?t=2`);
  check(
    'QR endpoint returns SVG',
    qr.status === 200 &&
      (qr.headers.get('content-type') ?? '').includes('image/svg+xml') &&
      (await qr.text()).startsWith('<svg'),
  );
  check('QR endpoint rejects a bad table', (await fetch(`${BASE}/api/qr/cafe-test?t=abc`)).status === 400);
  check('unknown slug is a 404', (await fetch(`${BASE}/m/nope`)).status === 404);

  // Security headers
  const head = await fetch(BASE);
  check(
    'security headers are set',
    head.headers.get('x-content-type-options') === 'nosniff' &&
      !!head.headers.get('content-security-policy') &&
      !head.headers.get('x-powered-by'),
  );
} catch (e) {
  failures++;
  console.error('FAIL  unexpected error:', e);
} finally {
  await browser?.close();
  server.kill();
  await new Promise((r) => setTimeout(r, 500));
  rmSync(dir, { recursive: true, force: true });
}
console.log(failures === 0 ? '\nAll e2e checks passed.' : `\n${failures} e2e check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
