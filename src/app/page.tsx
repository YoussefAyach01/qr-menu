import Link from 'next/link';

const STEPS = [
  ['Ajoutez vos plats', 'Catégories, prix en dirhams, noms en français et en arabe. Cinq minutes suffisent.'],
  ['Imprimez le QR code', 'Une carte de table par numéro de table, prête à imprimer en A6.'],
  [
    'Recevez les commandes',
    'Le client compose sa commande et vous l’envoie sur WhatsApp, avec son numéro de table.',
  ],
] as const;

export default function Home() {
  return (
    <>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="font-display text-2xl font-bold">Tawla</span>
        <nav aria-label="Compte" className="flex items-center gap-3">
          <Link href="/login" className="min-h-11 px-2 py-2 font-semibold underline">
            Connexion
          </Link>
          <Link href="/signup" className="btn btn-solid">
            Créer mon menu
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1.2fr_1fr] md:py-16">
          <div>
            <p className="text-sm font-bold tracking-widest text-brand uppercase">
              Menu QR pour restaurants et cafés
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight font-bold sm:text-5xl">
              Votre carte sur le téléphone de vos clients. Leur commande sur le vôtre.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              Plus de cartes plastifiées à réimprimer à chaque hausse de prix. Modifiez un plat, il change
              partout. Les commandes arrivent sur WhatsApp : aucune application à installer, ni pour vous ni
              pour vos clients.
            </p>
            <p className="mt-6 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-solid">
                Créer mon menu gratuitement
              </Link>
              <Link href="/m/demo" className="btn">
                Voir un menu de démonstration
              </Link>
            </p>
          </div>

          {/* The thing the customer sees, drawn in CSS so the page needs no images */}
          <div
            aria-hidden="true"
            className="mx-auto w-full max-w-64 rounded-[2rem] border-4 border-ink bg-white p-3 shadow-xl"
          >
            <div className="rounded-xl bg-brand px-3 py-2 font-display font-bold text-white">Dar Zitoun</div>
            {[
              ['Tajine d’agneau', '95 MAD'],
              ['Couscous', '85 MAD'],
              ['Pastilla', '70 MAD'],
              ['Thé à la menthe', '20 MAD'],
            ].map(([n, p]) => (
              <div key={n} className="flex items-center justify-between border-b border-line py-2 text-sm">
                <span>{n}</span>
                <span className="font-semibold">{p}</span>
              </div>
            ))}
            <div className="mt-3 rounded-lg bg-brand py-2 text-center text-sm font-semibold text-white">
              Commander sur WhatsApp
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10" aria-labelledby="how">
          <h2 id="how" className="font-display text-3xl font-bold">
            Comment ça marche
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="card">
                <span className="text-sm font-bold text-brand">Étape {i + 1}</span>
                <h3 className="mt-1 text-xl font-bold">{title}</h3>
                <p className="mt-2 text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10" aria-labelledby="pricing">
          <h2 id="pricing" className="font-display text-3xl font-bold">
            Tarifs
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="text-xl font-bold">Gratuit</h3>
              <p className="mt-1 text-3xl font-bold">0 MAD</p>
              <ul className="mt-3 list-disc ps-5 text-muted">
                <li>Jusqu’à 20 plats</li>
                <li>QR code et cartes de table</li>
                <li>Commandes WhatsApp</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="text-xl font-bold">Pro</h3>
              <p className="mt-1 text-3xl font-bold">
                99 MAD <span className="text-base font-normal text-muted">/ mois</span>
              </p>
              <ul className="mt-3 list-disc ps-5 text-muted">
                <li>Plats illimités</li>
                <li>Tout ce qui est dans Gratuit</li>
                <li>Assistance par WhatsApp</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted">Tawla · fait au Maroc</footer>
    </>
  );
}
