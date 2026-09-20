import Link from 'next/link';
import {
  addCategoryAction,
  addItemAction,
  deleteCategoryAction,
  deleteItemAction,
  logoutAction,
  saveSettingsAction,
  toggleItemAction,
  updateItemAction,
} from '@/app/actions';
import { getDb } from '@/lib/db';
import { ERRORS, MESSAGES, pick } from '@/lib/messages';
import { formatMAD } from '@/lib/money';
import { ACCENTS } from '@/lib/palette';
import { countItems, getMenu, PLAN_ITEM_LIMIT, type Item } from '@/lib/repo';
import { requireOwner } from '@/lib/session';

export const metadata = { title: 'Tableau de bord' };
export const dynamic = 'force-dynamic';

const priceValue = (cents: number) => (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2).replace('.', ',');

function ItemFields({ item }: { item?: Item }) {
  const id = item ? `i${item.id}` : 'new';
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor={`${id}-name`}>
          Nom du plat
        </label>
        <input
          className="field"
          id={`${id}-name`}
          name="name"
          required
          maxLength={80}
          defaultValue={item?.name}
        />
      </div>
      <div>
        <label className="label" htmlFor={`${id}-price`}>
          Prix (MAD)
        </label>
        <input
          className="field"
          id={`${id}-price`}
          name="price"
          required
          inputMode="decimal"
          placeholder="45"
          defaultValue={item ? priceValue(item.price_cents) : ''}
        />
      </div>
      <div>
        <label className="label" htmlFor={`${id}-name_ar`}>
          Nom en arabe (facultatif)
        </label>
        <input
          className="field"
          dir="rtl"
          id={`${id}-name_ar`}
          name="name_ar"
          maxLength={80}
          defaultValue={item?.name_ar}
        />
      </div>
      <div>
        <label className="label" htmlFor={`${id}-desc`}>
          Description (facultatif)
        </label>
        <input
          className="field"
          id={`${id}-desc`}
          name="description"
          maxLength={300}
          defaultValue={item?.description}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`${id}-desc_ar`}>
          Description en arabe (facultatif)
        </label>
        <input
          className="field"
          dir="rtl"
          id={`${id}-desc_ar`}
          name="description_ar"
          maxLength={300}
          defaultValue={item?.description_ar}
        />
      </div>
    </div>
  );
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { restaurant } = await requireOwner();
  const { msg, error } = await searchParams;
  const db = getDb();
  const menu = getMenu(db, restaurant.id, { onlyAvailable: false });
  const used = countItems(db, restaurant.id);
  const limit = PLAN_ITEM_LIMIT[restaurant.plan];
  const menuPath = `/m/${restaurant.slug}`;
  const flash = pick(MESSAGES, msg);
  const problem = pick(ERRORS, error);
  const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);

  return (
    <div style={{ ['--accent' as string]: restaurant.accent }}>
      <header className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <p className="font-display text-2xl font-bold">{restaurant.name}</p>
          <p className="text-sm text-muted">
            Offre {restaurant.plan === 'pro' ? 'Pro' : 'Gratuite'} · {used}/
            {Number.isFinite(limit) ? limit : '∞'} plats
          </p>
        </div>
        <form action={logoutAction}>
          <button className="btn" type="submit">
            Se déconnecter
          </button>
        </form>
      </header>

      <main className="mx-auto grid max-w-4xl gap-6 px-4 pb-16">
        {flash && (
          <p role="status" className="rounded-lg border border-green-800 bg-green-50 p-3 text-green-900">
            {flash}
          </p>
        )}
        {problem && (
          <p role="alert" className="rounded-lg border border-red-700 bg-red-50 p-3 text-red-900">
            {problem}
          </p>
        )}

        <section className="card grid gap-4 sm:grid-cols-[auto_1fr]" aria-labelledby="share">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/qr/${restaurant.slug}`}
            alt={`QR code du menu de ${restaurant.name}`}
            width={160}
            height={160}
            className="size-40 rounded-lg border border-line"
          />
          <div>
            <h2 id="share" className="font-display text-2xl font-bold">
              Votre menu en ligne
            </h2>
            <p className="mt-1 break-all">
              <Link className="underline" style={{ color: 'var(--accent)' }} href={menuPath}>
                {menuPath}
              </Link>
            </p>
            <p className="mt-3 flex flex-wrap gap-2">
              <Link className="btn btn-solid" href={menuPath}>
                Voir mon menu
              </Link>
              <Link className="btn" href="/dashboard/print">
                Imprimer les cartes de table
              </Link>
            </p>
          </div>
        </section>

        <section aria-labelledby="menu-h" className="grid gap-4">
          <h2 id="menu-h" className="font-display text-2xl font-bold">
            Mon menu
          </h2>

          {menu.length === 0 && (
            <p className="card text-muted">
              Aucune catégorie pour l’instant. Ajoutez-en une ci-dessous (Entrées, Plats, Boissons…).
            </p>
          )}

          {menu.map((c) => (
            <article key={c.id} className="card" aria-labelledby={`cat-${c.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id={`cat-${c.id}`} className="text-xl font-bold">
                  {c.name}
                  {c.name_ar && (
                    <span dir="rtl" lang="ar" className="ms-3 text-muted">
                      {c.name_ar}
                    </span>
                  )}
                </h3>
                <form action={deleteCategoryAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    className="btn btn-danger"
                    type="submit"
                    aria-label={`Supprimer la catégorie ${c.name} et ses plats`}
                  >
                    Supprimer
                  </button>
                </form>
              </div>

              <ul className="mt-3 divide-y divide-line">
                {c.items.map((i) => (
                  <li key={i.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={i.available ? '' : 'text-muted line-through'}>
                        <span className="font-semibold">{i.name}</span> · {formatMAD(i.price_cents)}
                        {!i.available && <span className="ms-2 no-underline">(épuisé)</span>}
                      </p>
                      <div className="flex gap-2">
                        <form action={toggleItemAction}>
                          <input type="hidden" name="id" value={i.id} />
                          <input type="hidden" name="available" value={i.available ? '0' : '1'} />
                          <button
                            className="btn"
                            type="submit"
                            aria-label={`${i.available ? 'Marquer épuisé' : 'Remettre en vente'} : ${i.name}`}
                          >
                            {i.available ? 'Épuisé' : 'Disponible'}
                          </button>
                        </form>
                        <form action={deleteItemAction}>
                          <input type="hidden" name="id" value={i.id} />
                          <button className="btn btn-danger" type="submit" aria-label={`Supprimer ${i.name}`}>
                            Supprimer
                          </button>
                        </form>
                      </div>
                    </div>
                    <details className="mt-2">
                      <summary
                        className="min-h-11 cursor-pointer py-2 font-semibold"
                        style={{ color: 'var(--accent)' }}
                      >
                        Modifier {i.name}
                      </summary>
                      <form action={updateItemAction} className="mt-2 grid gap-3">
                        <input type="hidden" name="id" value={i.id} />
                        <ItemFields item={i} />
                        <button className="btn btn-solid justify-self-start" type="submit">
                          Enregistrer
                        </button>
                      </form>
                    </details>
                  </li>
                ))}
              </ul>

              <details className="mt-3 rounded-lg border border-dashed border-line p-3">
                <summary
                  className="min-h-11 cursor-pointer py-2 font-semibold"
                  style={{ color: 'var(--accent)' }}
                >
                  Ajouter un plat à « {c.name} »
                </summary>
                <form action={addItemAction} className="mt-2 grid gap-3">
                  <input type="hidden" name="category_id" value={c.id} />
                  <ItemFields />
                  <button className="btn btn-solid justify-self-start" type="submit">
                    Ajouter le plat
                  </button>
                </form>
              </details>
            </article>
          ))}

          <form
            action={addCategoryAction}
            className="card grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <div>
              <label className="label" htmlFor="cat-name">
                Nouvelle catégorie
              </label>
              <input
                className="field"
                id="cat-name"
                name="name"
                required
                maxLength={60}
                placeholder="Entrées"
              />
            </div>
            <div>
              <label className="label" htmlFor="cat-name-ar">
                En arabe (facultatif)
              </label>
              <input className="field" dir="rtl" id="cat-name-ar" name="name_ar" maxLength={60} />
            </div>
            <button className="btn btn-solid" type="submit">
              Ajouter
            </button>
          </form>
        </section>

        <section id="reglages" className="card" aria-labelledby="settings-h">
          <h2 id="settings-h" className="font-display text-2xl font-bold">
            Réglages
          </h2>
          <form action={saveSettingsAction} className="mt-3 grid gap-4">
            <div>
              <label className="label" htmlFor="s-name">
                Nom du restaurant
              </label>
              <input
                className="field"
                id="s-name"
                name="name"
                required
                maxLength={80}
                defaultValue={restaurant.name}
              />
            </div>
            <div>
              <label className="label" htmlFor="s-wa">
                Numéro WhatsApp des commandes
              </label>
              <input
                className="field"
                id="s-wa"
                name="whatsapp"
                required
                inputMode="tel"
                defaultValue={`+${restaurant.whatsapp}`}
              />
            </div>
            <fieldset>
              <legend className="label">Couleur du menu</legend>
              <div className="flex flex-wrap gap-3">
                {ACCENTS.map((a) => (
                  <label
                    key={a.id}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-3"
                  >
                    <input
                      type="radio"
                      name="accent"
                      value={a.hex}
                      defaultChecked={a.hex === restaurant.accent}
                    />
                    <span aria-hidden="true" className="size-5 rounded-full" style={{ background: a.hex }} />
                    {a.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="btn btn-solid justify-self-start" type="submit">
              Enregistrer les réglages
            </button>
          </form>
        </section>

        <section className="card" aria-labelledby="plan-h">
          <h2 id="plan-h" className="font-display text-2xl font-bold">
            Offre
          </h2>
          {restaurant.plan === 'pro' ? (
            <p className="mt-2">Vous êtes sur l’offre Pro : plats illimités.</p>
          ) : stripeReady ? (
            <p className="mt-2 text-muted">
              Le paiement en ligne est configuré côté serveur mais n’est pas encore relié à ce bouton.
            </p>
          ) : (
            <p className="mt-2 text-muted">
              Offre gratuite : 20 plats. Le paiement en ligne n’est pas configuré sur ce serveur. Pour passer
              à Pro (99 MAD par mois), contactez l’assistance.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
