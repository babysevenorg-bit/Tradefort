import "dotenv/config";
import { db, pool } from "../src/db";
import { instruments, signals } from "../src/db/schema";
import { SEED_INSTRUMENTS } from "../src/lib/market-core";

/* ------------------------------------------------------------------ *
 * Production seed — market data + content only.                       *
 *                                                                    *
 * Previously this also created a demo user (demo@meridian.app) with a *
 * fake $100k paper balance, 11 trades, 5 deposits and a watchlist —  *
 * that was test data and has been removed so the deployed app starts *
 * clean for real users + real payments. Real users sign up via       *
 * /register and get their own wallets.                                *
 * ------------------------------------------------------------------ */

const now = Date.now();
const ago = (mins: number) => new Date(now - mins * 60000);

async function seedInstruments() {
  for (const i of SEED_INSTRUMENTS) {
    await db
      .insert(instruments)
      .values({
        symbol: i.symbol,
        name: i.name,
        klass: i.klass,
        basePrice: i.basePrice.toFixed(6),
        decimals: i.decimals,
        volatility: i.volatility.toFixed(6),
        payoutBp: i.payoutBp,
        exchange: i.exchange,
        spread: i.spread.toFixed(6),
        binary: i.binary,
      })
      .onConflictDoUpdate({
        target: instruments.symbol,
        set: { name: i.name, klass: i.klass, basePrice: i.basePrice.toFixed(6) },
      });
  }
}

async function seedSignals() {
  await db.delete(signals);
  const seedSignals: Array<Partial<typeof signals.$inferInsert>> = [
    { symbol: "EUR/USD", klass: "forex", direction: "long", timeframe: "H1", entry: "1.08420", stop: "1.08100", target: "1.09120", confidence: 84, source: "Meridian Quant", headline: "EUR/USD bullish engulfing above 1.0840 handle", note: "H1 closed bullish after a London-session sweep of Asia lows. Target the 1.0912 swing high; invalidation on a 4H close below 1.0810.", status: "active", createdAt: ago(41) },
    { symbol: "BTC/USDT", klass: "crypto", direction: "long", timeframe: "M15", entry: "67940.00", stop: "66820.00", target: "71200.00", confidence: 78, source: "On-chain Flow Desk", headline: "BTC spot CVD divergence into the New York open", note: "Coinbase premium turned positive while perp funding stayed flat — spot-led push. Scale in on the retest of 67,940.", status: "active", createdAt: ago(18) },
    { symbol: "XAU/USD", klass: "metal", direction: "short", timeframe: "H4", entry: "2344.80", stop: "2361.00", target: "2306.00", confidence: 66, source: "Macro Desk · Nairobi", headline: "Gold rejection at the 2,348 supply shelf", note: "Real yields ticking higher into the US session. Take profit in thirds at 2,322 / 2,312 / 2,306.", status: "active", createdAt: ago(96) },
    { symbol: "USD/KES", klass: "forex", direction: "short", timeframe: "D1", entry: "129.840", stop: "130.600", target: "128.200", confidence: 71, source: "Meridian Quant", headline: "Shilling stabilises as CBK mop-up drains liquidity", note: "Watch the 128.20 handle — a break opens 127.40. Position size small, the pair moves on quoteflow.", status: "active", createdAt: ago(310) },
    { symbol: "SOL/USDT", klass: "crypto", direction: "long", timeframe: "H1", entry: "164.20", stop: "159.80", target: "178.40", confidence: 88, source: "On-chain Flow Desk", headline: "SOL breakout from 6-day accumulation range", note: "Range high reclaimed with 2.4× average volume. Trailing stop under the breakout candle low.", status: "hit", createdAt: ago(720) },
    { symbol: "GBP/USD", klass: "forex", direction: "long", timeframe: "M30", entry: "1.26980", stop: "1.26720", target: "1.27480", confidence: 59, source: "Meridian Quant", headline: "Cable range fade rejected — setup invalidated", note: "Cable closed back inside the range. Setup retired, no entry.", status: "invalid", createdAt: ago(1500) },
  ];
  await db.insert(signals).values(seedSignals as []);
}

async function main() {
  await seedInstruments();
  await seedSignals();
  console.log("Seeded: 16 instruments + 6 signals (real-accounts mode — no demo user).");
}

main()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });
