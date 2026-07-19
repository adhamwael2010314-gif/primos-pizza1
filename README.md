# Primo's Pizza — Online Ordering (Dokki Branch)

A real, self-contained ordering site: customer menu + cart + checkout, backed by
an Express API that stores orders on disk, plus a password-protected staff
dashboard to manage incoming orders.

## What's real here

- **Backend**: Node.js + Express (`server.js`). Orders are validated and
  priced *server-side* (never trusted from the browser), then saved to
  `data/orders.json`.
- **Customer site**: `public/index.html` — fetches the live menu from
  `/api/menu`, builds a cart client-side, and posts the order to
  `/api/orders`.
- **Staff dashboard**: `public/admin.html` — fetches orders from
  `/api/orders` (protected by an admin key) and can update order status.
- **Call button**: a plain `tel:` link — dials the restaurant directly, no
  backend needed.

## Run it locally

```bash
npm install
npm start
```

Then open:
- `http://localhost:3000` — customer ordering site
- `http://localhost:3000/admin.html` — staff dashboard (default password: `primos2026`)

**Before going live, change these:**
- Replace `tel:+20000000000` in `public/index.html` with the real phone number.
- Set a real admin password via the `ADMIN_KEY` environment variable (see below) — don't ship the default.
- Update menu items/prices in `server.js` (the `MENU` array — this is the single source of truth used for both display and price calculation).
- Update the address/hours in `public/index.html` if they change.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |
| `ADMIN_KEY` | `primos2026` | Password required to view/update orders in the dashboard |

Set them locally with a `.env` file (not committed) or export them in your shell:
```bash
export ADMIN_KEY="a-real-password-here"
export PORT=3000
npm start
```

## Deploying for real

This is a plain Node/Express app, so it runs on any Node host. Free/cheap options:

- **[Render](https://render.com)** — connect your GitHub repo, set build command
  `npm install`, start command `npm start`, add the `ADMIN_KEY` env var in the
  dashboard. Free tier available.
- **[Railway](https://railway.app)** — similar flow, connect repo and deploy.
- **A VPS** (DigitalOcean, Hetzner, etc.) — clone the repo, `npm install`,
  run with `pm2` or a systemd service, put Nginx in front for HTTPS.

⚠️ **Note on storage**: orders are saved to a JSON file on disk
(`data/orders.json`). This works fine for a single restaurant branch on a
single server, but most free hosts (Render free tier, etc.) don't guarantee
that disk survives redeploys. If you outgrow this or move to multiple
branches, swap `readOrders`/`writeOrders` in `server.js` for a real database
(Postgres is the easiest managed option on Render/Railway) — the API routes
don't need to change.

## Adding real card payments later

Right now payment is "cash or card on delivery" — no online charge happens.
To accept real online payments, integrate a gateway like
[Paymob](https://paymob.com) (popular in Egypt) or
[Stripe](https://stripe.com): you'd add an API call in the `/api/orders`
route to create a payment intent/session and redirect the customer to
complete payment before marking the order confirmed.

## Project structure

```
primos-pizza/
├── server.js            # Express API + static file server
├── package.json
├── data/
│   └── orders.json      # created automatically, gitignored
└── public/
    ├── index.html        # customer ordering site
    ├── admin.html         # staff dashboard
    └── styles.css          # shared styles
```
