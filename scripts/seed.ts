import "dotenv/config";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, pool } from "../src/db";
import {
  users,
  wallets,
  instruments,
  trades,
  signals,
  deposits,
  watchlist,
} from "../src/db/schema";
import { SEED_INSTRUMENTS, simPrice } from "../src/lib/market-core";

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

async function main() {
  await seedInstruments();

  const existing = await db.select().from(users).where(eq(users.email, "demo@meridian.app")).limit(1);
  let user = existing[0];
  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        name: "Amani Wanjiru",
        email: "demo@meridian.app",
        country: "Kenya",
        passwordHash: await bcrypt.hash("demo1234", 10),
        accountMode: "demo",
      })
      .returning();
  }

  const walletRows = [
    { currency: "USD", kind: "demo", label: "Demo paper balance", balance: "100000.00", address: null },
    { currency: "USD", kind: "real", label: "Card · Mastercard / Visa", balance: "2480.00", address: null },
    { currency: "KES", kind: "real", label: "M-Pesa Safaricom", balance: "184500.00", address: "2547•••••21" },
    { currency: "USDT", kind: "real", label: "Tether · TRC20 + ERC20", balance: "640.50", address: "TQ7mN4xVb2kR9sYgHdW3pLuZcE5aXn1JvF" },
  ];
  for (const w of walletRows) {
    await db
      .insert(wallets)
      .values({ userId: user.id, ...w })
      .onConflictDoNothing();
  }

  await db.delete(trades).where(eq(trades.userId, user.id));
  const price = (s: string) => {
    const i = SEED_INSTRUMENTS.find((x) => x.symbol === s)!;
    return simPrice(s, i.basePrice, i.volatility, now);
  };

  const seedTrades: Array<Partial<typeof trades.$inferInsert>> = [
    { symbol: "BTC/USDT", klass: "crypto", product: "spot", mode: "demo", side: "buy", amount: "4000.00", quantity: "0.05846", leverage: 5, entryPrice: "66980.40", stopLoss: "65200.00", takeProfit: "71500.00", status: "open", pnl: "0", openedAt: ago(184) },
    { symbol: "EUR/USD", klass: "forex", product: "forex", mode: "demo", side: "buy", amount: "1500.00", quantity: "13807.7", leverage: 10, entryPrice: "1.08420", stopLoss: "1.08100", takeProfit: "1.09120", status: "open", pnl: "0", openedAt: ago(96) },
    { symbol: "USD/KES", klass: "forex", product: "forex", mode: "demo", side: "sell", amount: "800.00", quantity: "61.8", leverage: 10, entryPrice: "129.840", stopLoss: "130.400", takeProfit: "128.600", status: "open", pnl: "0", openedAt: ago(52) },
    { symbol: "XAU/USD", klass: "metal", product: "spot", mode: "demo", side: "buy", amount: "2000.00", quantity: "0.8556", leverage: 20, entryPrice: "2318.40", exitPrice: "2349.10", status: "closed", pnl: "530.11", openedAt: ago(1420), closedAt: ago(610) },
    { symbol: "ETH/USDT", klass: "crypto", product: "spot", mode: "demo", side: "sell", amount: "1800.00", quantity: "0.5112", leverage: 3, entryPrice: "3602.10", exitPrice: "3524.80", status: "closed", pnl: "118.62", openedAt: ago(2600), closedAt: ago(2180) },
    { symbol: "NAS100", klass: "index", product: "forex", mode: "demo", side: "buy", amount: "1200.00", quantity: "0.6613", leverage: 10, entryPrice: "18042.6", exitPrice: "17948.2", status: "closed", pnl: "-62.63", openedAt: ago(3100), closedAt: ago(2900) },
    { symbol: "GBP/USD", klass: "forex", product: "binary", mode: "demo", side: "up", amount: "250.00", leverage: 1, entryPrice: "1.27102", exitPrice: "1.27244", payoutBp: 8700, status: "won", pnl: "217.50", expiry: ago(400), openedAt: ago(405), closedAt: ago(400) },
    { symbol: "SOL/USDT", klass: "crypto", product: "binary", mode: "demo", side: "down", amount: "180.00", leverage: 1, entryPrice: "171.240", exitPrice: "172.910", payoutBp: 8800, status: "lost", pnl: "-180.00", expiry: ago(1200), openedAt: ago(1205), closedAt: ago(1200) },
    { symbol: "BTC/USDT", klass: "crypto", product: "binary", mode: "demo", side: "up", amount: "300.00", leverage: 1, entryPrice: "67880.20", exitPrice: "68140.90", payoutBp: 9000, status: "won", pnl: "270.00", expiry: ago(3000), openedAt: ago(3005), closedAt: ago(3000) },
    { symbol: "USD/JPY", klass: "forex", product: "forex", mode: "real", side: "buy", amount: "500.00", quantity: "3.31", leverage: 20, entryPrice: "150.980", stopLoss: "150.600", takeProfit: "151.800", status: "open", pnl: "0", openedAt: ago(28) },
    { symbol: "AAPL", klass: "stock", product: "spot", mode: "real", side: "buy", amount: "750.00", quantity: "3.487", leverage: 1, entryPrice: "214.98", status: "open", pnl: "0", openedAt: ago(1400) },
  ];
  await db.insert(trades).values(seedTrades.map((t) => ({ userId: user.id, ...t })) as []);

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

  await db.delete(deposits).where(eq(deposits.userId, user.id));
  const seedDeposits: Array<Partial<typeof deposits.$inferInsert>> = [
    { method: "mpesa", amount: "15000.00", currency: "KES", reference: "MP784192035", channelNote: "Safaricom 0722 ••• 418", status: "completed", createdAt: ago(2880), settledAt: ago(2878) },
    { method: "mpesa", amount: "8500.00", currency: "KES", reference: "MP771004821", channelNote: "Safaricom 0710 ••• 093", status: "completed", createdAt: ago(420), settledAt: ago(419) },
    { method: "usdt", amount: "640.50", currency: "USDT", reference: "0x9f41c8ab77e2d104", channelNote: "TRC20 · 12 confirmations", status: "completed", createdAt: ago(9800), settledAt: ago(9742) },
    { method: "mastercard", amount: "500.00", currency: "USD", reference: "AUTH559184", channelNote: "Mastercard •••• 4417", status: "completed", createdAt: ago(15600), settledAt: ago(15599) },
    { method: "visa", amount: "250.00", currency: "USD", reference: "AUTH561902", channelNote: "Visa •••• 2210", status: "pending", createdAt: ago(12) },
  ];
  await db.insert(deposits).values(seedDeposits.map((d) => ({ userId: user.id, ...d })) as []);

  await db.delete(watchlist).where(eq(watchlist.userId, user.id));
  await db
    .insert(watchlist)
    .values(
      ["BTC/USDT", "EUR/USD", "USD/KES", "XAU/USD", "NVDA"].map((symbol) => ({
        userId: user.id,
        symbol,
        note: null,
      })),
    )
    .onConflictDoNothing();

  console.log("Seeded: instruments, user demo@meridian.app / demo1234, trades, signals, deposits, watchlist");
}

main()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });
