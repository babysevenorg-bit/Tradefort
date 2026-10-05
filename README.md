# Tradefort (Meridian Terminal)

A full-stack trading terminal — forex, crypto, indices, metals, and binary options —
with a live market board, trade ticket, signals, wallets, M-Pesa/USDT/Mastercard/Visa
deposit flows, a demo/real account switch, and a learn page.

Built with **Next.js 16 (App Router) · TypeScript · Tailwind v4 · Drizzle ORM ·
PostgreSQL · JWT auth (jose + bcryptjs)**.

---

## Stack

| Layer        | Tech                                                            |
| ------------ | --------------------------------------------------------------- |
| Framework    | Next.js 16 (App Router, Turbopack)                              |
| Language     | TypeScript 5                                                    |
| Styling      | Tailwind CSS v4 + a custom "terminal" design system             |
| Database     | PostgreSQL (any provider) via `pg`                             |
| ORM          | Drizzle ORM                                                     |
| Auth         | httpOnly JWT cookie (`jose`) + `bcryptjs` password hashing     |
| Market data  | Binance public REST API with a deterministic simulation fallback |
| Motion      | framer-motion                                                    |

## Local development

```bash
bun install            # or npm install / pnpm install
cp .env.example .env   # then fill in DATABASE_URL + AUTH_SECRET

# 1. create the schema + seed demo data (16 instruments, demo user, trades, signals…)
bun run db:setup       # runs scripts/seed.ts (idempotent)

# 2. start the dev server
bun run dev            # http://localhost:3000
```

**No demo account** — the app is real-only. Register a fresh account at `/register` to start (real wallets start at $0; fund via M-Pesa, Mastercard or Visa through Paystack).

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new) (Vercel auto-detects Next.js).
3. Add environment variables (Project Settings → Environment Variables):
   - `DATABASE_URL` — your Postgres connection string (use Neon's **pooled** endpoint for serverless).
   - `AUTH_SECRET` — a long random string (e.g. `openssl rand -base64 48`).
   - `PAYSTACK_SECRET_KEY` — `sk_live_…` from the [Paystack dashboard → API Keys](https://dashboard.paystack.com/#/settings/keys) (Live mode).
   - `PAYSTACK_PUBLIC_KEY` — `pk_live_…` (same place).
   - `APP_BASE_URL` — your Vercel production origin, e.g. `https://tradefort.vercel.app` (no trailing slash; used to build the post-payment callback URL).
4. In the **Paystack dashboard** → Settings → API Configuration, set the **Webhook URL** to `https://<your-vercel-domain>/api/paystack/webhook` (the authoritative, HMAC-signed payment confirmation that auto-settles deposits).
5. After the first deploy, create the schema + seed market data:
   ```bash
   DATABASE_URL=postgresql://... bun run db:push && bun run db:setup
   ```
   (`db:push` creates the tables from `src/db/schema.ts`; `db:setup` seeds 16 instruments + 6 signals — no demo user.)

## Payments (Paystack)

Real deposits are processed by **Paystack** — M-Pesa (KES) and Mastercard/Visa (USD) —
with the following flow:

1. User picks a method + enters an amount on `/dashboard/wallet`.
2. `POST /api/deposits` creates a `pending` deposit and calls Paystack's
   `transaction/initialize` → returns an `authorization_url`.
3. The browser redirects to Paystack's hosted checkout (M-Pesa STK push or card entry).
4. On payment, Paystack:
   - redirects the browser to `/api/paystack/callback` (server-side `verify` + settle +
     redirect to the wallet), AND
   - POSTs a signed webhook to `/api/paystack/webhook` (the authoritative path —
     HMAC-SHA512 signature verification, amount/currency re-check, then `settleDeposit`
     credits the source-currency wallet + the USD trading wallet).

Both paths are idempotent (`if dep.status !== 'pending' skip`) and both verify with
Paystack server-side before crediting — the browser redirect alone is never trusted.

## Project structure

```
src/
├── app/
│   ├── page.tsx                  # landing (hero, live board, value props)
│   ├── login/ register/          # auth pages
│   ├── dashboard/
│   │   ├── layout.tsx            # auth gate + MarketProvider + SessionProvider + Shell
│   │   ├── page.tsx              # overview (P&L, open positions, signals, watchlist)
│   │   ├── terminal/page.tsx     # candlestick chart + trade ticket
│   │   ├── signals/page.tsx      # quant signals feed
│   │   ├── markets/page.tsx      # instruments table
│   │   ├── wallet/page.tsx       # balances, deposits, withdrawals
│   │   └── learn/page.tsx        # education content
│   └── api/                      # 10 route handlers (auth, trades, deposits, …)
├── components/                  # shell, market, terminal/{candle-chart,ticket}, ui
├── db/                           # drizzle client + schema (PostgreSQL)
├── lib/                          # auth (JWT), market (Binance feed), wallet, api helpers
└── middleware.ts                 # /dashboard auth gate
```

## Notes

- Market quotes are pulled live from Binance's public `/api/v3/ticker/24hr` for the 5
  crypto pairs; everything else (forex, metals, indices, stocks) uses a deterministic
  simulation seeded from `src/lib/market-core.ts`.
- Binary options settle lazily — open positions are checked against the live price on
  every `/api/trades` GET, so expiries/stop-targets resolve on the next page view.
- `next.config.ts` sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`
  so the build never hard-fails on type/lint nits. Turn these off when you want strict CI.
