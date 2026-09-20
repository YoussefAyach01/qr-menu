// Creates a demo restaurant (slug "demo") so the landing page's demo link works.
// Usage: npm run seed   (login: demo@example.com / demo-password-1)
import { openDb } from '../src/lib/db.ts';
import { signUp } from '../src/lib/accounts.ts';
import { addCategory, addItem, getRestaurantBySlug } from '../src/lib/repo.ts';

const db = openDb(process.env.DATABASE_PATH ?? './data/qr-menu.db');
if (getRestaurantBySlug(db, 'demo')) {
  console.log('Demo already exists, nothing to do.');
} else {
  const r = signUp(db, {
    email: 'demo@example.com',
    password: 'demo-password-1',
    restaurantName: 'Demo',
    whatsapp: '0612345678',
  });
  if (!r.ok) throw new Error(`seed failed: ${r.error}`);
  const restaurant = getRestaurantBySlug(db, 'demo');
  if (!restaurant) throw new Error('seed failed');
  db.prepare("UPDATE restaurants SET name = 'Dar Zitoun (démo)' WHERE id = ?").run(restaurant.id);
  const plats = addCategory(db, restaurant.id, { name: 'Plats', name_ar: 'الأطباق' });
  const boissons = addCategory(db, restaurant.id, { name: 'Boissons', name_ar: 'المشروبات' });
  const item = (name: string, name_ar: string, description: string, price: number) => ({
    name,
    name_ar,
    description,
    description_ar: '',
    price_cents: price * 100,
  });
  for (const i of [
    item('Tajine d’agneau aux pruneaux', 'طاجين لحم بالبرقوق', 'Amandes grillées, pain maison', 95),
    item('Couscous du vendredi', 'كسكس الجمعة', 'Sept légumes, poulet fermier', 85),
    item('Pastilla au poulet', 'بسطيلة بالدجاج', 'Cannelle et sucre glace', 70),
  ])
    addItem(db, restaurant, plats, i);
  for (const i of [
    item('Thé à la menthe', 'أتاي بالنعناع', 'Théière pour deux', 20),
    item('Jus d’orange pressé', 'عصير برتقال', '', 15),
  ])
    addItem(db, restaurant, boissons, i);
  console.log('Demo created: /m/demo');
}
