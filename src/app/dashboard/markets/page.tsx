"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Star, ArrowUpDown, Flame } from "lucide-react";
import { useMarket, useInstruments, Price } from "@/components/market";
import { useSession } from "@/components/shell";
import { Empty, LinkBtn, Panel, Pill, Skeleton } from "@/components/ui";

type SortKey = "symbol" | "klass" | "change" | "price";

export default function MarketsPage() {
  const { quotes } = useMarket();
  const { instruments, loading } = useInstruments();
  const { me } = useSession();
  const [klass, setKlass] = useState("all");
  const [sort, setSort] = useState<SortKey>("symbol");
  const [dir, setDir] = useState<1 | -1>(1);
  const [stars, setStars] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => setStars(me?.watchlist ?? []), [me?.watchlist]);

  const classes = ["all", ...Array.from(new Set(instruments.map((i) => i.klass)))];

  const rows = useMemo(() => {
    const list = instruments.filter((i) => klass === "all" || i.klass === klass);
    const val = (i: (typeof instruments)[number]) => {
      if (sort === "symbol") return i.symbol;
      if (sort === "klass") return i.klass;
      if (sort === "price") return quotes[i.symbol]?.price ?? 0;
      return quotes[i.symbol]?.changePct ?? 0;
    };
    return [...list].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (typeof av === "string" || typeof bv === "string")
        return String(av).localeCompare(String(bv)) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [instruments, klass, sort, dir, quotes]);

  const watched = instruments.filter((i) => stars.includes(i.symbol));

  async function toggleStar(s: string) {
    const has = stars.includes(s);
    setStars((p) => (has ? p.filter((x) => x !== s) : [...p, s]));
    setBusy(true);
    await fetch("/api/watchlist", {
      method: has ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: s }),
    });
    setBusy(false);
  }

  function head(key: SortKey, label: string, align = "left") {
    return (
      <th
        className={`border-b border-hair px-3 py-2 font-semibold ${align === "right" ? "text-right" : "text-left"}`}
      >
        <button
          onClick={() => {
            if (sort === key) setDir((d) => (d === 1 ? -1 : 1));
            else {
              setSort(key);
              setDir(1);
            }
          }}
          className={`inline-flex items-center gap-1 text-[10px] tracking-[0.14em] uppercase transition-colors ${
            sort === key ? "text-amber" : "text-warm hover:text-[#e7e5e1]"
          }`}
        >
          {label}
          {sort === key && <ArrowUpDown size={10} />}
        </button>
      </th>
    );
  }

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hair pb-3">
        <div>
          <p className="label text-warm">16 instruments · crypto, forex, metals, indices, equities</p>
          <h1 className="font-display text-3xl font-medium text-paper">Markets</h1>
        </div>
        <div className="flex flex-wrap gap-1">
          {classes.map((c) => (
            <button
              key={c}
              onClick={() => setKlass(c)}
              className={`h-7 px-2.5 text-[10px] font-bold tracking-[0.12em] uppercase transition-colors ${
                klass === c ? "bg-amber text-ink" : "border border-hair text-warm hover:border-amber hover:text-amber"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <Panel
        title={
          <span className="flex items-center gap-1.5">
            <Star size={11} /> Watchlist · {watched.length}
          </span>
        }
      >
        {watched.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-warm">
            Nothing starred yet — hit the star on any row below to pin it here.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-px bg-hair sm:grid-cols-3 lg:grid-cols-5">
            {watched.map((i) => (
              <div key={i.symbol} className="bg-panel px-3 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-[0.14em] text-warm uppercase">{i.symbol}</span>
                  <button onClick={() => toggleStar(i.symbol)} className="text-amber" disabled={busy}>
                    <Star size={11} fill="#ffb020" />
                  </button>
                </div>
                <div className="tnum mt-1 font-mono text-base text-amber">
                  <Price symbol={i.symbol} decimals={i.decimals} />
                </div>
                <div className="text-[10px]">
                  <span className={(quotes[i.symbol]?.changePct ?? 0) >= 0 ? "text-up" : "text-down"}>
                    {(quotes[i.symbol]?.changePct ?? 0) >= 0 ? "▲" : "▼"}{" "}
                    {Math.abs(quotes[i.symbol]?.changePct ?? 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="All markets" right={<span className="text-[10px] tracking-widest text-warm uppercase">click a header to sort</span>}>
        {loading ? (
          <Skeleton rows={8} />
        ) : rows.length === 0 ? (
          <Empty title="No markets in this class" hint="Try another asset class — the desk lists crypto, forex, metals, indices and single names." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-xs">
              <thead className="bg-panel2">
                <tr>
                  <th className="w-9 border-b border-hair px-3 py-2" />
                  {head("symbol", "Instrument")}
                  {head("klass", "Class")}
                  {head("price", "Last", "right")}
                  <th className="border-b border-hair px-3 py-2 text-right text-[10px] tracking-[0.14em] text-warm uppercase">
                    24h
                  </th>
                  <th className="border-b border-hair px-3 py-2 text-right text-[10px] tracking-[0.14em] text-warm uppercase">
                    Spread
                  </th>
                  <th className="border-b border-hair px-3 py-2 text-right text-[10px] tracking-[0.14em] text-warm uppercase">
                    Payout
                  </th>
                  <th className="border-b border-hair px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((i, idx) => {
                  const q = quotes[i.symbol];
                  const up = (q?.changePct ?? 0) >= 0;
                  const hot = Math.abs(q?.changePct ?? 0) > 1.5;
                  return (
                    <tr key={i.symbol} className="border-b border-hair transition-colors hover:bg-panel2">
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => toggleStar(i.symbol)}
                          className={stars.includes(i.symbol) ? "text-amber" : "text-[#3f4652] hover:text-amber"}
                          aria-label={`Toggle ${i.symbol} watchlist`}
                        >
                          <Star size={13} fill={stars.includes(i.symbol) ? "#ffb020" : "none"} />
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-[#e7e5e1]">{i.symbol}</span>
                        <span className="ml-2 text-[11px] text-warm">{i.name}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] tracking-[0.12em] text-warm uppercase">{i.klass}</span>
                      </td>
                      <td className="tnum px-3 py-2.5 text-right font-mono text-amber">
                        <Price symbol={i.symbol} decimals={i.decimals} />
                      </td>
                      <td className={`tnum px-3 py-2.5 text-right font-mono ${up ? "text-up" : "text-down"}`}>
                        {up ? "+" : ""}
                        {(q?.changePct ?? 0).toFixed(2)}%
                        {hot && <Flame size={11} className="ml-1 inline text-amber" />}
                      </td>
                      <td className="tnum px-3 py-2.5 text-right font-mono text-warm">
                        {Number(i.spread).toFixed(i.decimals > 3 ? 5 : 2)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Pill tone={i.binary ? "amber" : "muted"}>{(i.payoutBp / 100).toFixed(0)}%</Pill>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <LinkBtn href="/dashboard/terminal" size="sm">
                          Trade
                        </LinkBtn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <div className="h-2" />
    </div>
  );
}
