"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fmtPrice, type Quote } from "@/lib/market-core";

type Snap = { source: "LIVE" | "SIM"; ts: number; quotes: Record<string, Quote> };
type Instrument = {
  id: number;
  symbol: string;
  name: string;
  klass: string;
  basePrice: string;
  decimals: number;
  volatility: string;
  payoutBp: number;
  exchange: string;
  spread: string;
  binary: number | boolean;
};

const MarketCtx = createContext<Snap & { ready: boolean }>({
  source: "SIM",
  ts: 0,
  quotes: {},
  ready: false,
});

export function MarketProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<Snap>({ source: "SIM", ts: 0, quotes: {} });
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const pull = useCallback(async () => {
    try {
      const res = await fetch("/api/market", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Snap;
      setSnap(data);
      setReady(true);
    } catch {
      /* keep last known snapshot */
    }
  }, []);

  useEffect(() => {
    pull();
    timer.current = setInterval(pull, 1500);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [pull]);

  return (
    <MarketCtx.Provider value={{ ...snap, ready }}>{children}</MarketCtx.Provider>
  );
}

export const useMarket = () => useContext(MarketCtx);

let instCache: Promise<{ instruments: Instrument[] }> | null = null;

export function useInstruments() {
  const [list, setList] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!instCache) instCache = fetch("/api/instruments").then((r) => r.json());
    instCache
      .then((d) => setList(d.instruments ?? []))
      .finally(() => setLoading(false));
  }, []);
  return { instruments: list, loading };
}

/** A price that flashes green/red for half a second whenever it ticks. */
export function Price({
  symbol,
  decimals = 2,
  className = "",
}: {
  symbol: string;
  decimals?: number;
  className?: string;
}) {
  const { quotes } = useMarket();
  const q = quotes[symbol];
  const prev = useRef<number | null>(null);
  const [dir, setDir] = useState<"" | "flash-up" | "flash-down">("");

  useEffect(() => {
    if (!q) return;
    if (prev.current !== null && prev.current !== q.price) {
      setDir(q.price > prev.current ? "flash-up" : "flash-down");
      const t = setTimeout(() => setDir(""), 520);
      prev.current = q.price;
      return () => clearTimeout(t);
    }
    prev.current = q.price;
  }, [q]);

  if (!q) return <span className={`tnum text-warm ${className}`}>—</span>;
  return (
    <span className={`tnum inline-block px-1 ${dir} ${className}`}>
      {fmtPrice(q.price, decimals)}
    </span>
  );
}

export function Change({ symbol, className = "" }: { symbol: string; className?: string }) {
  const { quotes } = useMarket();
  const q = quotes[symbol];
  if (!q) return <span className="tnum text-warm">—</span>;
  const up = q.changePct >= 0;
  return (
    <span className={`tnum ${up ? "text-up" : "text-down"} ${className}`}>
      {up ? "+" : ""}
      {q.changePct.toFixed(2)}%
    </span>
  );
}

/** Endless scrolling tape of every market — sits under the top bar. */
export function TickerTape({ symbols }: { symbols?: string[] }) {
  const { quotes, source } = useMarket();
  const keys = symbols ?? Object.keys(quotes);
  const items = keys.length ? keys : ["BTC/USDT", "EUR/USD", "XAU/USD", "USD/KES", "NAS100"];
  const row = [...items, ...items];
  return (
    <div className="relative flex h-8 items-center overflow-hidden border-b border-hair bg-panel2">
      <span className="z-10 flex h-full shrink-0 items-center gap-1.5 border-r border-hair bg-amber px-2 text-[10px] font-bold tracking-[0.14em] text-ink">
        <span className="h-1.5 w-1.5 rounded-full bg-ink blink" />
        {source === "LIVE" ? "LIVE" : "SIM"}
      </span>
      <div className="tape flex min-w-max items-center">
        {row.map((sym, i) => {
          const q = quotes[sym];
          const inst = INSTRUMENT_META[sym];
          const up = (q?.changePct ?? 0) >= 0;
          return (
            <span
              key={`${sym}-${i}`}
              className="flex items-center gap-2 border-r border-hair px-4 text-[11px]"
            >
              <span className="font-semibold tracking-wide text-warm">{sym}</span>
              <span className="tnum text-[#e7e5e1]">
                {q ? fmtPrice(q.price, inst?.d ?? 2) : "····"}
              </span>
              {q && (
                <span className={`tnum ${up ? "text-up" : "text-down"}`}>
                  {up ? "▲" : "▼"} {Math.abs(q.changePct).toFixed(2)}%
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export const INSTRUMENT_META: Record<string, { d: number; name: string; klass: string }> = {
  "BTC/USDT": { d: 2, name: "Bitcoin", klass: "crypto" },
  "ETH/USDT": { d: 2, name: "Ethereum", klass: "crypto" },
  "SOL/USDT": { d: 2, name: "Solana", klass: "crypto" },
  "XRP/USDT": { d: 4, name: "Ripple", klass: "crypto" },
  "BNB/USDT": { d: 2, name: "BNB", klass: "crypto" },
  "EUR/USD": { d: 5, name: "Euro · US Dollar", klass: "forex" },
  "GBP/USD": { d: 5, name: "Sterling · US Dollar", klass: "forex" },
  "USD/KES": { d: 3, name: "US Dollar · Shilling", klass: "forex" },
  "USD/JPY": { d: 3, name: "US Dollar · Yen", klass: "forex" },
  "AUD/USD": { d: 5, name: "Aussie · US Dollar", klass: "forex" },
  "XAU/USD": { d: 2, name: "Gold Spot", klass: "metal" },
  US30: { d: 1, name: "Dow Jones 30", klass: "index" },
  NAS100: { d: 1, name: "Nasdaq 100", klass: "index" },
  AAPL: { d: 2, name: "Apple Inc.", klass: "stock" },
  TSLA: { d: 2, name: "Tesla Inc.", klass: "stock" },
  NVDA: { d: 2, name: "NVIDIA Corp.", klass: "stock" },
};
