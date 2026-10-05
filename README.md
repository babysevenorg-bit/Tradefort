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

**Demo account:** `demo@meridian.app` / `demo1234` (seeded with $100,000 paper balance,
4 wallets, 11 trades, 6 signals, 5 deposits).

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new) (Vercel auto-detects Next.js).
3. Add environment variables (Project Settings → Environment Variables):
   - `DATABASE_URL` — your Postgres connection string (use Vercel Postgres, Neon, or Supabase).
   - `AUTH_SECRET` — a long random string (e.g. `openssl rand -base64 48`).
4. After the first deploy, run the seed against your production Postgres to create tables
   and demo data:
   ```bash
   # from a local checkout with DATABASE_URL pointing at your Vercel Postgres
   bun run db:setup
   ```
   (Alternatively, run `bun run db:generate` + apply the generated SQL in
   `drizzle/*.sql` with any SQL client.)

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
