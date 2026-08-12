# Custom Mugs UK

A compact, mobile-friendly mug personaliser for 11 oz and 15 oz mugs. Customers can choose from 42 supplied templates, edit both text lines, select a font and colour, add multiple designs to their basket, and continue to Stripe Checkout.

## Print files

The browser produces a double-sided PNG for each mug:

- 11 oz: `2700 × 1050px`
- 15 oz: `2700 × 1140px`
- Format: PNG at the exact Printful wrap dimensions used by this project

Each 1050px square design is centred once on each half of the wrap. The server checks the PNG signature and pixel dimensions before saving it.

## Run locally

```bash
npm install
npm run dev:vercel
```

Open `http://localhost:3000`.

## Deploy on Vercel

1. Import `malkygpt1-ship-it/CustomMugsUK` into Vercel.
2. Connect a **private Vercel Blob** store to the project. Vercel supplies `BLOB_READ_WRITE_TOKEN` automatically.
3. Add `STRIPE_RESTRICTED_KEY` (preferred) or `STRIPE_SECRET_KEY` in Project Settings → Environment Variables.
4. Confirm the mug and delivery prices in `lib/catalogue.ts`.
5. Set `CHECKOUT_ENABLED=true` only after those prices and the Stripe mode are confirmed.
6. Redeploy.

`vercel.json` explicitly selects the standard Next.js build, so a normal Git import is enough. No custom output directory is required.

## Checkout flow

- Print-ready PNGs upload one at a time to private object storage, keeping each request within Vercel's function upload limit.
- The final order manifest is saved privately and its key is attached to Stripe Checkout metadata.
- Product prices, delivery price, artwork dimensions and the GB shipping restriction are enforced on the server.
- Checkout is deliberately gated by `CHECKOUT_ENABLED` to prevent placeholder prices being charged accidentally.

## Before launch

- Confirm the prices in `lib/catalogue.ts`.
- Use a Stripe test key for the first end-to-end payment.
- Confirm commercial rights for every image in `public/templates-base`.
- Add your fulfilment/webhook process for paid orders before accepting live payments.

## Commands

```bash
npm run dev:vercel    # Standard Next.js development server
npm run build:vercel  # Production build used by Vercel
npm run lint          # ESLint
```
