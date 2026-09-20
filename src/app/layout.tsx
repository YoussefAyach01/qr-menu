import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Tawla · Menu QR et commandes WhatsApp', template: '%s · Tawla' },
  description:
    'Créez le menu QR de votre restaurant et recevez les commandes sur WhatsApp. Gratuit jusqu’à 20 plats.',
  icons: { icon: 'data:,' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
