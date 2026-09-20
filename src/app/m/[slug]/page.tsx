import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { getMenu, getRestaurantBySlug } from '@/lib/repo';
import { isAccent } from '@/lib/palette';
import type { Lang } from '@/lib/money';
import { MenuView, type ViewCategory } from './menu-view';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string; t?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = getRestaurantBySlug(getDb(), slug);
  return r ? { title: `${r.name} · Menu`, robots: { index: true } } : {};
}

export default async function MenuPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lang: langParam, t } = await searchParams;
  const db = getDb();
  const restaurant = getRestaurantBySlug(db, slug);
  if (!restaurant) notFound();

  const lang: Lang = langParam === 'ar' ? 'ar' : 'fr';
  const table = t && /^\d{1,3}$/.test(t) ? t : '';
  // Prefer the Arabic text when reading in Arabic and the owner provided one; otherwise fall back to French.
  const pickText = (fr: string, ar: string) => (lang === 'ar' && ar ? ar : fr);

  const categories: ViewCategory[] = getMenu(db, restaurant.id, { onlyAvailable: true }).map((c) => ({
    id: c.id,
    name: pickText(c.name, c.name_ar),
    items: c.items.map((i) => ({
      id: i.id,
      name: pickText(i.name, i.name_ar),
      description: pickText(i.description, i.description_ar),
      priceCents: i.price_cents,
    })),
  }));

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      lang={lang}
      style={{ ['--accent' as string]: isAccent(restaurant.accent) ? restaurant.accent : '#0f766e' }}
    >
      <MenuView
        restaurantName={restaurant.name}
        whatsapp={restaurant.whatsapp}
        categories={categories}
        lang={lang}
        table={table}
        otherLangHref={`/m/${encodeURIComponent(slug)}?lang=${lang === 'ar' ? 'fr' : 'ar'}${table ? `&t=${table}` : ''}`}
      />
    </div>
  );
}
