"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Star, Trash2, XCircle, Search } from "lucide-react";
import { CandleChart } from "@/components/terminal/candle-chart";
import { Ticket } from "@/components/terminal/ticket";
import { useMarket, useInstruments, Price, Change, INSTRUMENT_META } from "@/components/market";
import { useSession } from "@/components/shell";
import { Btn, Empty, Panel, Pill, Skeleton } from "@/components/ui";
import { fmtPrice, fmtMoney } from "@/lib/market-core";

type Trade = {
  id: number;
  symbol: string;
  klass: string;
  mode: string;
  product: string;
  side: string;
  amount: string;
  entryPrice: string;
  exitPrice: string | null;
  leverage: number;
  expiry: string | null;
  status: string;
  pnl: string;
  openedAt: string;
};

const CLASSES = ["all", "crypto", "forex", "metal", "index", "stock"];

function ExpiryRing({ expiry }: { expiry: string }) {
  const target = new Date(expiry).getTime();
  const [left, setLeft] = useState(Math.max(0, target - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, target - Date.now())), 250);
    return () => clearInterval(id);
  }, [target]);
  const total = 60_000;
  const pct = Math.min(1, left / total);
  const secs = Math.ceil(left / 1000);
  const r = 9;
  const c = 2 * Math.PI * r;
  const urgent = left < 10_000;
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
        <circle cx="12" cy="12" r={r} fill="none" stroke="#1e222a" strokeWidth="3" />
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke={urgent ? "#f6465d" : "#ffb020"}
          strokeWidth="3"
          strokeDasharray={`${c * pct} ${c}`}
          strokeLinecap="butt"
        />
      </svg>
      <span className={`tnum font-mono text-[11px] ${urgent ? "text-down" : "text-amber"}`}>
        {secs}s
      </span>
    </span>
  );
}

export default function TerminalPage() {
  const { me, mode, balance, refresh } = useSession();
  const { quotes } = useMarket();
  const { instruments, loading: instLoading } = useInstruments();
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [klass, setKlass] = useState("all");
  const [query, setQuery] = useState("");
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [stars, setStars] = useState<string[]>([]);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "err" } | null>(null);
  const [tab, setTab] = useState<"open" | "history">("open");

  const loadTrades = useCallback(async () => {
    try {
      const res = await fetch("/api/trades", { cache: "no-store" });
      if (res.ok) setTrades((await res.json()).trades);
    } catch {
      /* keep */
    }
  }, []);

  useEffect(() => {
    loadTrades();
    const id = setInterval(loadTrades, 2500);
    return () => clearInterval(id);
  }, [loadTrades]);

  useEffect(() => {
    setStars(me?.watchlist ?? []);
  }, [me?.watchlist]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const list = instruments.filter((i) => {
      const okClass = klass === "all" || i.klass === klass;
      const q = query.trim().toLowerCase();
      const okQuery = !q || i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q);
      return okClass && okQuery;
    });
    return list;
  }, [instruments, klass, query]);

  const inst = instruments.find((i) => i.symbol === symbol);
  const decimals = inst?.decimals ?? INSTRUMENT_META[symbol]?.d ?? 2;
  const payoutBp = inst?.payoutBp ?? 8700;

  const openForSymbol = (trades ?? []).filter(
    (t) => t.symbol === symbol && t.status === "open" && t.mode === mode,
  );
  const markers = openForSymbol.map((t) => ({
    price: Number(t.entryPrice),
    label: `${t.side.toUpperCase()} ${fmtMoney(Number(t.amount))}`,
    tone: "amber" as const,
  }));

  const visible = (trades ?? []).filter((t) =>
    tab === "open" ? t.status === "open" : t.status !== "open",
  );

  async function toggleStar(s: string) {
    const has = stars.includes(s);
    setStars((prev) => (has ? prev.filter((x) => x !== s) : [...prev, s]));
    await fetch("/api/watchlist", {
      method: has ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: s }),
    });
  }

  async function closeTrade(t: Trade, action: "close" | "cancel") {
    setTrades((prev) =>
      prev
        ? action === "cancel"
          ? prev.filter((x) => x.id !== t.id)
          : prev.map((x) => (x.id === t.id ? { ...x, status: "settling" } : x))
        : prev,
    );
    const res = await fetch(`/api/trades/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) setToast({ msg: data.error ?? "Could not update position", tone: "err" });
    await loadTrades();
    await refresh();
  }

  async function removeTrade(t: Trade) {
    setTrades((prev) => (prev ? prev.filter((x) => x.id !== t.id) : prev));
    await fetch(`/api/trades/${t.id}`, { method: "DELETE" });
    await loadTrades();
    await refresh();
  }

  const rail = (
    <div className="flex h-full flex-col border-hair bg-panel xl:border-r">
      <div className="border-b border-hair p-2">
        <div className="flex items-center gap-2 border border-hair2 bg-ink px-2">
          <Search size={13} className="text-warm" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search markets"
            className="h-8 w-full bg-transparent text-xs text-[#e7e5e1] placeholder:text-[#4c5561] focus:outline-none"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {CLASSES.map((c) => (
            <button
              key={c}
              onClick={() => setKlass(c)}
              className={`h-5 px-1.5 text-[9px] font-bold tracking-[0.1em] uppercase transition-colors ${
                klass === c ? "bg-amber text-ink" : "border border-hair text-warm hover:text-amber"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto">
        {instLoading && <Skeleton rows={6} />}
        {filtered.map((i) => {
          const q = quotes[i.symbol];
          const up = (q?.changePct ?? 0) >= 0;
          return (
            <button
              key={i.symbol}
              onClick={() => setSymbol(i.symbol)}
              className={`flex w-full items-center justify-between gap-2 border-b border-hair px-2.5 py-2 text-left transition-colors ${
                symbol === i.symbol ? "bg-panel2" : "hover:bg-panel2/60"
              }`}
            >
              <span className="min-w-0">
                <span
                  className={`block truncate text-[12px] font-semibold ${symbol === i.symbol ? "text-amber" : "text-[#e7e5e1]"}`}
                >
                  {i.symbol}
                </span>
                <span className="block truncate text-[10px] text-warm">{i.name}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="tnum block font-mono text-[11px] text-[#e7e5e1]">
                  <Price symbol={i.symbol} decimals={i.decimals} />
                </span>
                <span className={`tnum block font-mono text-[10px] ${up ? "text-up" : "text-down"}`}>
                  {up ? "+" : ""}
                  {(q?.changePct ?? 0).toFixed(2)}%
                </span>
              </span>
            </button>
          );
        })}
        {!instLoading && !filtered.length && (
          <p className="p-4 text-center text-xs text-warm">No market matches “{query}”.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative">
      <div className="grid grid-cols-1 xl:grid-cols-[228px_minmax(0,1fr)_312px]">
        <div className="max-h-[300px] overflow-hidden xl:max-h-none xl:col-start-1 xl:overflow-visible">
          {rail}
        </div>

        <div className="min-w-0 border-hair xl:border-r">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hair bg-panel2 px-3 py-2">
            <div className="flex items-baseline gap-3">
              <h1 className="font-mono text-lg font-semibold text-paper">{symbol}</h1>
              <span className="text-[11px] text-warm">{inst?.name ?? INSTRUMENT_META[symbol]?.name}</span>
              <Pill tone="neutral">{inst?.exchange ?? "MERIDIAN"}</Pill>
              <Pill tone="amber">
                Pay {(payoutBp / 100).toFixed(0)}%
              </Pill>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-2xl leading-none text-amber">
                <Price symbol={symbol} decimals={decimals} />
              </span>
              <Change symbol={symbol} className="text-sm" />
              <button
                onClick={() => toggleStar(symbol)}
                title="Watchlist"
                className={stars.includes(symbol) ? "text-amber" : "text-warm hover:text-amber"}
              >
                <Star size={15} fill={stars.includes(symbol) ? "#ffb020" : "none"} />
              </button>
            </div>
          </div>

          <CandleChart symbol={symbol} decimals={decimals} markers={markers} />

          <div className="border-y border-hair bg-panel2 px-3 py-1.5 text-[11px] text-warm">
            Live book · spread{" "}
            <span className="tnum text-amber">{inst ? Number(inst.spread).toFixed(decimals > 3 ? 5 : 2) : "—"}</span>{" "}
            · {openForSymbol.length} open on this symbol
          </div>
        </div>

        <div className="border-hair bg-panel xl:border-l">
          <Ticket
            symbol={symbol}
            decimals={decimals}
            mode={mode}
            payoutBp={payoutBp}
            balance={balance}
            onPlaced={(msg, tone) => {
              setToast({ msg, tone });
              loadTrades();
              refresh();
            }}
          />
        </div>
      </div>

      {/* positions */}
      <section className="border-t border-hair">
        <div className="flex items-center justify-between gap-3 border-b border-hair bg-panel2 px-3">
          <div className="flex">
            {(["open", "history"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`h-9 border-b-2 px-3 text-[11px] font-bold tracking-[0.14em] uppercase ${
                  tab === t ? "border-amber text-amber" : "border-transparent text-warm hover:text-[#e7e5e1]"
                }`}
              >
                {t === "open" ? `Open positions (${(trades ?? []).filter((t2) => t2.status === "open").length})` : "History"}
              </button>
            ))}
          </div>
          <span className="hidden text-[10px] tracking-[0.14em] text-warm uppercase sm:inline">
            Auto-settling on expiry · stop / target fills
          </span>
        </div>

        {trades === null ? (
          <Skeleton rows={4} />
        ) : visible.length === 0 ? (
          <Empty
            title={tab === "open" ? "No open positions" : "No settled trades yet"}
            hint={
              tab === "open"
                ? "Pick a market on the left, choose spot, forex or a binary expiry, then send the order from the ticket."
                : "Closed positions, binary payouts and stop/target fills will be listed here with their realised P&L."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-xs">
              <thead>
                <tr className="text-left text-[10px] tracking-[0.14em] text-warm uppercase">
                  {["Market", "Product", "Side", "Stake", "Entry", "Live", "Expiry", "P&L", ""].map((h) => (
                    <th key={h} className="border-b border-hair px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => {
                  const live = quotes[t.symbol]?.price ?? Number(t.exitPrice ?? t.entryPrice);
                  const dir = t.side === "buy" || t.side === "up" ? 1 : -1;
                  const unreal =
                    t.status === "open" && t.product !== "binary"
                      ? ((live - Number(t.entryPrice)) / Number(t.entryPrice)) * dir * Number(t.amount) * (t.leverage || 1)
                      : t.product === "binary" && t.status === "open"
                        ? 0
                        : Number(t.pnl);
                  return (
                    <tr key={t.id} className="border-b border-hair transition-colors hover:bg-panel2">
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-[#e7e5e1]">{t.symbol}</span>
                        <span className="ml-2 text-[10px] tracking-wider text-warm uppercase">{t.klass}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Pill tone={t.product === "binary" ? "amber" : "neutral"}>{t.product}</Pill>
                        <span className="ml-2 text-[10px] text-warm">{t.mode}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`text-[11px] font-bold tracking-wider uppercase ${
                            t.side === "buy" || t.side === "up" ? "text-up" : "text-down"
                          }`}
                        >
                          {t.side === "up" ? "▲" : t.side === "down" ? "▼" : "●"} {t.side}
                        </span>
                        {t.leverage > 1 && <span className="ml-1.5 text-[10px] text-warm">{t.leverage}×</span>}
                      </td>
                      <td className="tnum px-3 py-2.5 font-mono">{fmtMoney(Number(t.amount))}</td>
                      <td className="tnum px-3 py-2.5 font-mono text-warm">{fmtPrice(Number(t.entryPrice), decimals)}</td>
                      <td className="tnum px-3 py-2.5 font-mono text-amber">
                        {fmtPrice(live, decimals)}
                      </td>
                      <td className="px-3 py-2.5">
                        {t.expiry && t.status === "open" ? (
                          <ExpiryRing expiry={t.expiry} />
                        ) : t.status === "open" ? (
                          <span className="text-warm">GTC</span>
                        ) : (
                          <Pill tone={t.status === "won" ? "up" : t.status === "lost" ? "down" : "muted"}>
                            {t.status}
                          </Pill>
                        )}
                      </td>
                      <td
                        className={`tnum px-3 py-2.5 font-mono ${unreal > 0 ? "text-up" : unreal < 0 ? "text-down" : "text-warm"}`}
                      >
                        {t.status === "open" && t.product === "binary"
                          ? "—"
                          : `${unreal >= 0 ? "+" : ""}${fmtMoney(unreal)}`}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          {t.status === "open" && (
                            <Btn
                              size="sm"
                              onClick={() => closeTrade(t, t.product === "binary" ? "cancel" : "close")}
                            >
                              {t.product === "binary" ? "Cancel" : "Close"}
                            </Btn>
                          )}
                          <button
                            onClick={() => removeTrade(t)}
                            title="Remove"
                            className="p-1 text-warm transition-colors hover:text-down"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={`fixed right-4 bottom-4 z-50 flex max-w-sm items-start gap-2 border px-4 py-3 text-xs shadow-2xl ${
              toast.tone === "ok"
                ? "border-up bg-[#0a1a14] text-up"
                : "border-down bg-[#1a0a0e] text-down"
            }`}
          >
            <button onClick={() => setToast(null)} className="mt-0.5 text-warm hover:text-paper">
              <XCircle size={14} />
            </button>
            <span className="text-[#e7e5e1]">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
