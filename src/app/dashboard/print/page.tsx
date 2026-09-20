import Link from 'next/link';
import { requireOwner } from '@/lib/session';
import { PrintButton } from './print-button';

export const metadata = { title: 'Cartes de table' };
export const dynamic = 'force-dynamic';

export default async function PrintPage({ searchParams }: { searchParams: Promise<{ tables?: string }> }) {
  const { restaurant } = await requireOwner();
  const { tables } = await searchParams;
  const parsed = Number.parseInt(tables ?? '', 10);
  const count = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 60) : 0;
  // 0 means one generic card without a table number
  const cards: (number | null)[] = count === 0 ? [null] : Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div style={{ ['--accent' as string]: restaurant.accent }}>
      <div className="no-print mx-auto max-w-3xl px-4 py-4">
        <Link href="/dashboard" className="underline">
          ← Retour au tableau de bord
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold">Cartes de table</h1>
        <form className="mt-3 flex flex-wrap items-end gap-3" method="get">
          <div>
            <label className="label" htmlFor="tables">
              Nombre de tables (0 à 60)
            </label>
            <input
              className="field w-32"
              id="tables"
              name="tables"
              type="number"
              min={0}
              max={60}
              defaultValue={count}
            />
          </div>
          <button className="btn" type="submit">
            Mettre à jour
          </button>
          <PrintButton />
        </form>
        <p className="mt-2 text-sm text-muted">
          Chaque carte contient un QR code propre à sa table : la table est ajoutée automatiquement à la
          commande WhatsApp.
        </p>
      </div>

      <ul className="mx-auto grid max-w-3xl grid-cols-1 gap-4 px-4 pb-10 sm:grid-cols-2 print:max-w-none print:grid-cols-2">
        {cards.map((n) => (
          <li
            key={n ?? 'all'}
            className="break-inside-avoid rounded-2xl border-2 p-4 text-center"
            style={{ borderColor: 'var(--accent)' }}
          >
            <p className="font-display text-2xl font-bold">{restaurant.name}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/qr/${restaurant.slug}${n ? `?t=${n}` : ''}`}
              alt={`QR code${n ? ` de la table ${n}` : ''}`}
              width={200}
              height={200}
              className="mx-auto my-2 size-48"
            />
            <p className="font-semibold">Scannez pour voir le menu et commander</p>
            <p dir="rtl" lang="ar" className="text-muted">
              امسح الرمز لعرض القائمة والطلب
            </p>
            {n && <p className="mt-2 text-xl font-bold">Table {n}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
