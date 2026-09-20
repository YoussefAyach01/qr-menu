import type { DB } from './db.ts';
import { slugify, uniqueSlug } from './slug.ts';

export const PLAN_ITEM_LIMIT = { free: 20, pro: Number.POSITIVE_INFINITY } as const;

export interface User {
  id: number;
  email: string;
  password_hash: string;
}

export interface Restaurant {
  id: number;
  owner_id: number;
  slug: string;
  name: string;
  whatsapp: string;
  accent: string;
  plan: 'free' | 'pro';
}

export interface Category {
  id: number;
  restaurant_id: number;
  name: string;
  name_ar: string;
  position: number;
}

export interface Item {
  id: number;
  restaurant_id: number;
  category_id: number;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price_cents: number;
  available: number;
  position: number;
}

export interface MenuCategory extends Category {
  items: Item[];
}

export type ItemInput = Pick<Item, 'name' | 'name_ar' | 'description' | 'description_ar' | 'price_cents'>;
export type Result<T = undefined> =
  ({ ok: true } & (T extends undefined ? object : { value: T })) | { ok: false; error: string };

// node:sqlite returns loosely typed rows; the SELECTs below always return exactly these columns.
const one = <T>(row: unknown): T | undefined => (row ?? undefined) as T | undefined;
const many = <T>(rows: unknown): T[] => rows as T[];

export function createOwner(
  db: DB,
  input: { email: string; passwordHash: string; restaurantName: string; whatsapp: string; accent: string },
): Result<{ userId: number; restaurantId: number; slug: string }> {
  if (findUserByEmail(db, input.email)) return { ok: false, error: 'email_taken' };
  db.exec('BEGIN');
  try {
    const user = db
      .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
      .run(input.email.trim().toLowerCase(), input.passwordHash);
    const userId = Number(user.lastInsertRowid);
    const slug = uniqueSlug(slugify(input.restaurantName), (s) => !!getRestaurantBySlug(db, s));
    const r = db
      .prepare('INSERT INTO restaurants (owner_id, slug, name, whatsapp, accent) VALUES (?, ?, ?, ?, ?)')
      .run(userId, slug, input.restaurantName, input.whatsapp, input.accent);
    db.exec('COMMIT');
    return { ok: true, value: { userId, restaurantId: Number(r.lastInsertRowid), slug } };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function findUserByEmail(db: DB, email: string): User | undefined {
  return one<User>(
    db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email.trim()),
  );
}

export function findUserById(db: DB, id: number): User | undefined {
  return one<User>(db.prepare('SELECT id, email, password_hash FROM users WHERE id = ?').get(id));
}

export function getRestaurantByOwner(db: DB, ownerId: number): Restaurant | undefined {
  return one<Restaurant>(db.prepare('SELECT * FROM restaurants WHERE owner_id = ?').get(ownerId));
}

export function getRestaurantBySlug(db: DB, slug: string): Restaurant | undefined {
  return one<Restaurant>(db.prepare('SELECT * FROM restaurants WHERE slug = ?').get(slug));
}

export function updateRestaurant(
  db: DB,
  restaurantId: number,
  data: { name: string; whatsapp: string; accent: string },
): void {
  db.prepare('UPDATE restaurants SET name = ?, whatsapp = ?, accent = ? WHERE id = ?').run(
    data.name,
    data.whatsapp,
    data.accent,
    restaurantId,
  );
}

/** Full menu in display order. Diners get only available items and no empty categories. */
export function getMenu(db: DB, restaurantId: number, opts: { onlyAvailable: boolean }): MenuCategory[] {
  const categories = many<Category>(
    db.prepare('SELECT * FROM categories WHERE restaurant_id = ? ORDER BY position, id').all(restaurantId),
  );
  const items = many<Item>(
    db
      .prepare(
        `SELECT * FROM items WHERE restaurant_id = ? ${opts.onlyAvailable ? 'AND available = 1' : ''} ORDER BY position, id`,
      )
      .all(restaurantId),
  );
  const menu = categories.map((c) => ({ ...c, items: items.filter((i) => i.category_id === c.id) }));
  return opts.onlyAvailable ? menu.filter((c) => c.items.length > 0) : menu;
}

export function countItems(db: DB, restaurantId: number): number {
  const row = one<{ n: number }>(
    db.prepare('SELECT COUNT(*) AS n FROM items WHERE restaurant_id = ?').get(restaurantId),
  );
  return row?.n ?? 0;
}

export function addCategory(db: DB, restaurantId: number, data: { name: string; name_ar: string }): number {
  const next = one<{ p: number }>(
    db
      .prepare('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM categories WHERE restaurant_id = ?')
      .get(restaurantId),
  );
  const r = db
    .prepare('INSERT INTO categories (restaurant_id, name, name_ar, position) VALUES (?, ?, ?, ?)')
    .run(restaurantId, data.name, data.name_ar, next?.p ?? 1);
  return Number(r.lastInsertRowid);
}

/** Every write below is scoped by restaurant_id so one owner can never touch another's rows (IDOR). */
export function deleteCategory(db: DB, restaurantId: number, categoryId: number): boolean {
  return (
    Number(
      db.prepare('DELETE FROM categories WHERE id = ? AND restaurant_id = ?').run(categoryId, restaurantId)
        .changes,
    ) > 0
  );
}

export function addItem(
  db: DB,
  restaurant: Pick<Restaurant, 'id' | 'plan'>,
  categoryId: number,
  data: ItemInput,
): Result<{ id: number }> {
  const category = one<Category>(
    db.prepare('SELECT * FROM categories WHERE id = ? AND restaurant_id = ?').get(categoryId, restaurant.id),
  );
  if (!category) return { ok: false, error: 'category_not_found' };
  if (countItems(db, restaurant.id) >= PLAN_ITEM_LIMIT[restaurant.plan])
    return { ok: false, error: 'plan_limit' };
  const next = one<{ p: number }>(
    db.prepare('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM items WHERE category_id = ?').get(categoryId),
  );
  const r = db
    .prepare(
      `INSERT INTO items (restaurant_id, category_id, name, name_ar, description, description_ar, price_cents, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      restaurant.id,
      categoryId,
      data.name,
      data.name_ar,
      data.description,
      data.description_ar,
      data.price_cents,
      next?.p ?? 1,
    );
  return { ok: true, value: { id: Number(r.lastInsertRowid) } };
}

export function updateItem(db: DB, restaurantId: number, itemId: number, data: ItemInput): boolean {
  const r = db
    .prepare(
      `UPDATE items SET name = ?, name_ar = ?, description = ?, description_ar = ?, price_cents = ?
       WHERE id = ? AND restaurant_id = ?`,
    )
    .run(
      data.name,
      data.name_ar,
      data.description,
      data.description_ar,
      data.price_cents,
      itemId,
      restaurantId,
    );
  return Number(r.changes) > 0;
}

export function setItemAvailable(db: DB, restaurantId: number, itemId: number, available: boolean): boolean {
  const r = db
    .prepare('UPDATE items SET available = ? WHERE id = ? AND restaurant_id = ?')
    .run(available ? 1 : 0, itemId, restaurantId);
  return Number(r.changes) > 0;
}

export function deleteItem(db: DB, restaurantId: number, itemId: number): boolean {
  return (
    Number(
      db.prepare('DELETE FROM items WHERE id = ? AND restaurant_id = ?').run(itemId, restaurantId).changes,
    ) > 0
  );
}
