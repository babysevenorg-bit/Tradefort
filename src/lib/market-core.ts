export type Klass = "crypto" | "forex" | "index" | "stock" | "metal";

export type SeedInstrument = {
  symbol: string;
  name: string;
  klass: Klass;
  basePrice: number;
  decimals: number;
  volatility: number;
  payoutBp: number;
  exchange: string;
  spread: number;
  binary: boolean;
};

export const SEED_INSTRUMENTS: SeedInstrument[] = [
  { symbol: "BTC/USDT", name: "Bitcoin", klass: "crypto", basePrice: 68420.5, decimals: 2, volatility: 0.0016, payoutBp: 9000, exchange: "BINANCE", spread: 0.00012, binary: true },
  { symbol: "ETH/USDT", name: "Ethereum", klass: "crypto", basePrice: 3542.18, decimals: 2, volatility: 0.0019, payoutBp: 9000, exchange: "BINANCE", spread: 0.00014, binary: true },
  { symbol: "SOL/USDT", name: "Solana", klass: "crypto", basePrice: 168.42, decimals: 2, volatility: 0.0026, payoutBp: 8800, exchange: "BINANCE", spread: 0.0002, binary: true },
  { symbol: "XRP/USDT", name: "Ripple", klass: "crypto", basePrice: 0.6218, decimals: 4, volatility: 0.0024, payoutBp: 8800, exchange: "BINANCE", spread: 0.0003, binary: true },
  { symbol: "BNB/USDT", name: "BNB", klass: "crypto", basePrice: 592.7, decimals: 2, volatility: 0.0017, payoutBp: 8700, exchange: "BINANCE", spread: 0.00015, binary: true },
  { symbol: "EUR/USD", name: "Euro · US Dollar", klass: "forex", basePrice: 1.08642, decimals: 5, volatility: 0.0004, payoutBp: 8700, exchange: "FXCM", spread: 0.00008, binary: true },
  { symbol: "GBP/USD", name: "Sterling · US Dollar", klass: "forex", basePrice: 1.27184, decimals: 5, volatility: 0.0005, payoutBp: 8700, exchange: "FXCM", spread: 0.0001, binary: true },
  { symbol: "USD/KES", name: "US Dollar · Kenyan Shilling", klass: "forex", basePrice: 129.42, decimals: 3, volatility: 0.0004, payoutBp: 8500, exchange: "CFD KE", spread: 0.06, binary: true },
  { symbol: "USD/JPY", name: "US Dollar · Yen", klass: "forex", basePrice: 151.284, decimals: 3, volatility: 0.0004, payoutBp: 8700, exchange: "FXCM", spread: 0.012, binary: true },
  { symbol: "AUD/USD", name: "Aussie · US Dollar", klass: "forex", basePrice: 0.65842, decimals: 5, volatility: 0.0005, payoutBp: 8600, exchange: "FXCM", spread: 0.0001, binary: true },
  { symbol: "XAU/USD", name: "Gold Spot", klass: "metal", basePrice: 2338.6, decimals: 2, volatility: 0.0008, payoutBp: 8800, exchange: "LBMA", spread: 0.25, binary: true },
  { symbol: "US30", name: "Dow Jones 30", klass: "index", basePrice: 39218.4, decimals: 1, volatility: 0.0007, payoutBp: 8600, exchange: "CME", spread: 1.6, binary: true },
  { symbol: "NAS100", name: "Nasdaq 100", klass: "index", basePrice: 18142.7, decimals: 1, volatility: 0.0009, payoutBp: 8600, exchange: "CME", spread: 1.1, binary: true },
  { symbol: "AAPL", name: "Apple Inc.", klass: "stock", basePrice: 214.62, decimals: 2, volatility: 0.0011, payoutBp: 8500, exchange: "NASDAQ", spread: 0.03, binary: true },
  { symbol: "TSLA", name: "Tesla Inc.", klass: "stock", basePrice: 182.34, decimals: 2, volatility: 0.0018, payoutBp: 8500, exchange: "NASDAQ", spread: 0.04, binary: true },
  { symbol: "NVDA", name: "NVIDIA Corp.", klass: "stock", basePrice: 126.18, decimals: 2, volatility: 0.0016, payoutBp: 8500, exchange: "NASDAQ", spread: 0.03, binary: true },
];

/* ---------- deterministic price noise (shared client + server) ---------- */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function noise(seed: string, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(seed + ":" + i) * 2 - 1;
  const b = hash(seed + ":" + (i + 1)) * 2 - 1;
  const t = f * f * (3 - 2 * f);
  return a + (b - a) * t;
}

/** Smooth, deterministic, never-repeating-by-accident random walk around base. */
export function simPrice(symbol: string, base: number, vol: number, t: number): number {
  const s = t / 60000;
  let drift = 0;
  drift += noise(symbol, s) * 3.2;
  drift += noise(symbol + "b", s * 2.7) * 1.5;
  drift += noise(symbol + "c", s * 7.3) * 0.6;
  const wave = Math.sin(s * 0.9 + hash(symbol) * 6.28) * 0.5;
  const pct = (drift + wave) * vol * 6;
  return base * (1 + pct);
}

export function simChangePct(symbol: string, base: number, vol: number, t: number): number {
  const dayAgo = t - 86400000;
  const now = simPrice(symbol, base, vol, t);
  const then = simPrice(symbol, base, vol, dayAgo);
  return ((now - then) / then) * 100;
}

export type Quote = {
  symbol: string;
  price: number;
  changePct: number;
  high: number;
  low: number;
};

export function fmtPrice(v: number, decimals: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtMoney(v: number, currency = "USD"): string {
  const symbol = currency === "KES" ? "KSh " : currency === "USD" ? "$" : "";
  return (
    symbol +
    v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}
