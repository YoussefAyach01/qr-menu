import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type DB } from '../src/lib/db.ts';
import { logIn, signUp } from '../src/lib/accounts.ts';
import * as repo from '../src/lib/repo.ts';

let db: DB;
beforeEach(() => {
  db = openDb(':memory:');
});

const signup = (email: string, name = 'Dar Zitoun') =>
  signUp(db, { email, password: 'a-long-password', restaurantName: name, whatsapp: '0612345678' });

function owner(email: string, name?: string) {
  const r = signup(email, name);
  if (!r.ok) throw new Error(r.error);
  const restaurant = repo.getRestaurantByOwner(db, r.userId);
  if (!restaurant) throw new Error('no restaurant');
  return restaurant;
}

const item = (name: string, price = 1000) => ({
  name,
  name_ar: '',
  description: '',
  description_ar: '',
  price_cents: price,
});

describe('signup and login', () => {
  it('creates a user with a restaurant, a slug and a normalised WhatsApp number', () => {
    const r = owner('A@Example.com', 'Café Dar Zitoun');
    expect(r.slug).toBe('cafe-dar-zitoun');
    expect(r.whatsapp).toBe('212612345678');
    expect(r.plan).toBe('free');
  });

  it('gives a second restaurant with the same name a different slug', () => {
    owner('a@x.com');
    expect(owner('b@x.com').slug).toBe('dar-zitoun-2');
  });

  it('rejects a duplicate email, case-insensitively', () => {
    owner('a@x.com');
    expect(signup('A@X.com')).toEqual({ ok: false, error: 'email_taken' });
  });

  it.each([
    [{ email: 'nope', password: 'a-long-password', restaurantName: 'X Y', whatsapp: '0612345678' }, 'email'],
    [{ email: 'a@x.com', password: 'short', restaurantName: 'X Y', whatsapp: '0612345678' }, 'password'],
    [{ email: 'a@x.com', password: 'a-long-password', restaurantName: 'X Y', whatsapp: '123' }, 'whatsapp'],
    [
      { email: 'a@x.com', password: 'a-long-password', restaurantName: '', whatsapp: '0612345678' },
      'restaurantName',
    ],
  ])('rejects invalid signup %#', (input, field) => {
    expect(signUp(db, input)).toEqual({ ok: false, error: 'invalid_input', field });
  });

  it('logs in with the right password and uses one error for unknown user and wrong password', () => {
    owner('a@x.com');
    expect(logIn(db, { email: 'A@x.com', password: 'a-long-password' }).ok).toBe(true);
    const wrong = logIn(db, { email: 'a@x.com', password: 'nope-nope-nope' });
    const unknown = logIn(db, { email: 'ghost@x.com', password: 'a-long-password' });
    expect(wrong).toEqual({ ok: false, error: 'invalid_credentials' });
    expect(unknown).toEqual(wrong);
  });

  it('never stores the plaintext password', () => {
    owner('a@x.com');
    const u = repo.findUserByEmail(db, 'a@x.com');
    expect(u?.password_hash.startsWith('scrypt$')).toBe(true);
    expect(u?.password_hash).not.toContain('a-long-password');
  });
});

describe('menu', () => {
  it('shows diners only available items and hides empty categories', () => {
    const r = owner('a@x.com');
    const starters = repo.addCategory(db, r.id, { name: 'Entrées', name_ar: '' });
    const empty = repo.addCategory(db, r.id, { name: 'Vide', name_ar: '' });
    const a = repo.addItem(db, r, starters, item('Harira'));
    const b = repo.addItem(db, r, starters, item('Salade'));
    if (!a.ok || !b.ok) throw new Error('add failed');
    repo.setItemAvailable(db, r.id, b.value.id, false);

    const diner = repo.getMenu(db, r.id, { onlyAvailable: true });
    expect(diner.map((c) => c.name)).toEqual(['Entrées']);
    expect(diner[0]?.items.map((i) => i.name)).toEqual(['Harira']);
    const owned = repo.getMenu(db, r.id, { onlyAvailable: false });
    expect(owned.map((c) => c.id)).toEqual([starters, empty]);
    expect(owned[0]?.items).toHaveLength(2);
  });

  it('keeps insertion order via position', () => {
    const r = owner('a@x.com');
    const c = repo.addCategory(db, r.id, { name: 'C', name_ar: '' });
    for (const n of ['1', '2', '3']) repo.addItem(db, r, c, item(n));
    expect(repo.getMenu(db, r.id, { onlyAvailable: false })[0]?.items.map((i) => i.name)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  it('enforces the free plan item limit but not the pro plan', () => {
    const r = owner('a@x.com');
    const c = repo.addCategory(db, r.id, { name: 'C', name_ar: '' });
    for (let i = 0; i < repo.PLAN_ITEM_LIMIT.free; i++)
      expect(repo.addItem(db, r, c, item(`i${i}`)).ok).toBe(true);
    expect(repo.addItem(db, r, c, item('one too many'))).toEqual({ ok: false, error: 'plan_limit' });
    expect(repo.addItem(db, { id: r.id, plan: 'pro' }, c, item('fine on pro')).ok).toBe(true);
  });

  it('deleting a category deletes its items', () => {
    const r = owner('a@x.com');
    const c = repo.addCategory(db, r.id, { name: 'C', name_ar: '' });
    repo.addItem(db, r, c, item('x'));
    expect(repo.deleteCategory(db, r.id, c)).toBe(true);
    expect(repo.countItems(db, r.id)).toBe(0);
  });
});

describe('ownership (IDOR)', () => {
  it("one owner cannot edit, hide, delete or add into another owner's menu", () => {
    const mine = owner('a@x.com', 'Mine');
    const theirs = owner('b@x.com', 'Theirs');
    const theirCat = repo.addCategory(db, theirs.id, { name: 'T', name_ar: '' });
    const added = repo.addItem(db, theirs, theirCat, item('Secret'));
    if (!added.ok) throw new Error('setup');
    const id = added.value.id;

    expect(repo.updateItem(db, mine.id, id, item('Hacked'))).toBe(false);
    expect(repo.setItemAvailable(db, mine.id, id, false)).toBe(false);
    expect(repo.deleteItem(db, mine.id, id)).toBe(false);
    expect(repo.deleteCategory(db, mine.id, theirCat)).toBe(false);
    expect(repo.addItem(db, mine, theirCat, item('Injected'))).toEqual({
      ok: false,
      error: 'category_not_found',
    });

    const still = repo.getMenu(db, theirs.id, { onlyAvailable: true });
    expect(still[0]?.items.map((i) => [i.name, i.available])).toEqual([['Secret', 1]]);
  });

  it('is safe against SQL injection in text fields', () => {
    const r = owner('a@x.com');
    const c = repo.addCategory(db, r.id, { name: "x'); DROP TABLE items;--", name_ar: '' });
    expect(repo.addItem(db, r, c, item("'; DELETE FROM users;--")).ok).toBe(true);
    expect(repo.findUserByEmail(db, 'a@x.com')).toBeTruthy();
  });
});
