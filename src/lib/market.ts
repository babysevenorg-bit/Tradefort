import {
  SEED_INSTRUMENTS,
  simPrice,
  simChangePct,
  type Quote,
} from "./market-core";

export type MarketSnapshot = {
  source: "LIVE" | "SIM";
  ts: number;
  quotes: Record<string, Quote>;
};

const BINANCE_MAP: Record<string, string> = {
  "BTC/USDT": "BTCUSDT",
  "ETH/USDT": "ETHUSDT",
  "SOL/USDT": "SOLUSDT",
  "XRP/USDT": "XRPUSDT",
  "BNB/USDT": "BNBUSDT",
};

const TTL = 1200;
let cache: { snap: MarketSnapshot; at: number } | null = null;
const inflight: { p: Promise<MarketSnapshot> | null } = { p: null };

function simulated(now: number): MarketSnapshot {
  const quotes: Record<string, Quote> = {};
  for (const inst of SEED_INSTRUMENTS) {
    const price = simPrice(inst.symbol, inst.basePrice, inst.volatility, now);
    const changePct = simChangePct(inst.symbol, inst.basePrice, inst.volatility, now);
    quotes[inst.symbol] = {
      symbol: inst.symbol,
      price,
      changePct,
      high: price * (1 + inst.volatility * 4),
      low: price * (1 - inst.volatility * 4),
    };
  }
  return { source: "SIM", ts: now, quotes };
}

async function withTimeout(url: string, ms: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function build(now: number): Promise<MarketSnapshot> {
  const snap = simulated(now);
  try {
    const symbols = JSON.stringify(Object.values(BINANCE_MAP));
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`;
    const rows = (await withTimeout(url, 1400)) as Array<{
      symbol: string;
      lastPrice: string;
      priceChangePercent: string;
      highPrice: string;
      lowPrice: string;
    }>;
    for (const [sym, bin] of Object.entries(BINANCE_MAP)) {
      const row = rows.find((r) => r.symbol === bin);
      if (!row) continue;
      const inst = SEED_INSTRUMENTS.find((i) => i.symbol === sym)!;
      snap.quotes[sym] = {
        symbol: sym,
        price: Number(row.lastPrice),
        changePct: Number(row.priceChangePercent),
        high: Number(row.highPrice),
        low: Number(row.lowPrice),
      };
      void inst;
    }
    snap.source = "LIVE";
  } catch {
    /* offline / blocked — deterministic simulation stands in */
  }
  return snap;
}

export async function getMarket(): Promise<MarketSnapshot> {
  const now = Date.now();
  if (cache && now - cache.at < TTL) return cache.snap;
  if (inflight.p) return inflight.p;
  inflight.p = build(now)
    .then((snap) => {
      cache = { snap, at: Date.now() };
      inflight.p = null;
      return snap;
    })
    .catch((e) => {
      inflight.p = null;
      throw e;
    });
  return inflight.p;
}
