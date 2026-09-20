# qr-menu (Tawla): business one-pager

## Buyer and problem

Owners of cafes, restaurants, snack bars and tea rooms. Their printed menus are outdated the day prices change, they lose time taking simple orders at the table and by phone, and many already live on WhatsApp. They want something that works with the phone number they already use, not another app.

## Offer and pricing

| Plan                              | MAD / month | USD / month | Includes                                           |
| --------------------------------- | ----------- | ----------- | -------------------------------------------------- |
| Free                              | 0           | 0           | 20 dishes, QR + table cards, WhatsApp orders       |
| Pro                               | 99          | 10          | Unlimited dishes, priority WhatsApp support        |
| Setup service (optional, one-off) | 300 - 500   | 30 - 50     | You enter the menu, print A6 table cards, laminate |

Realistic goal: 20 paying restaurants = about 2,000 MAD/month. Hosting cost is roughly 40-80 MAD/month for a small VPS, so margin is high but absolute income is modest until you have volume.

## First 5 customers

1. Walk into cafes and restaurants near you at off-peak hours (15h-17h) with a phone showing the demo menu; offer to set up their real menu for free on the spot and leave a printed table card. Ask for the upgrade after 2 weeks.
2. Target places that already show prices on Instagram or Facebook: message them from their page with a QR code of their own menu pre-built (a 10-minute job with the tool) as the pitch.
3. Partner with a local printer or signage shop: they print table cards for restaurants anyway and can refer you for a small commission (for example one month free per referral).

## Accounts needed to go live

- A VPS or PaaS with persistent disk (about 40-80 MAD/month) and a domain (about 100 MAD/year).
- Optional later: Stripe for card billing (note: Stripe availability for Moroccan businesses is limited, so cash/bank transfer/CMI plus the manual Pro switch may be the realistic route at first), Resend or similar for password-reset e-mails.

## Honest limits

- Diners must have WhatsApp (almost all do in Morocco) and the restaurant must watch it; there is no kitchen display, no order history, no online payment.
- Competes with free tools (Google Sheets menus, Canva QR, Instagram) and existing menu-QR apps: the pitch is Arabic/French, MAD, WhatsApp-native, table numbers, no commission.
- Pro billing, password reset and e-mail verification are not built yet.
- Not tested on Safari/iOS or real Android phones, only headless desktop Chrome at 375px. WhatsApp hand-off was checked by inspecting the generated link, not by sending a real message.
