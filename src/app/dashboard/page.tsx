"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "@/components/shell";
import { useMarket, Price } from "@/components/market";
import { Empty, LinkBtn, Panel, Pill, Skeleton } from "@/components/ui";
import { fmtMoney, fmtPrice } from "@/lib/market-core";

type Trade = {
  id: number;
  symbol: string;
  product: string;
  side: string;
  amount: string;
  entryPrice: string;
  status: string;
  pnl: string;
  mode: string;
  openedAt: string;
  leverage: number;
};

function equitySeries(balance: number, seed: number) {
  const pts: number[] = [];
  let v = balance * 0.93;
  for (let i = 0; i < 48; i++) {
    const wave = Math.sin((i + seed) * 0.42) * 0.006 + Math.sin((i + seed) * 0.11) * 0.01;
    v = v * (1 + wave + 0.0016);
    pts.push(v);
  }
  pts[pts.length - 1] = balance;
  return pts;
}

function EquityCurve({ balance }: { balance: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const pts = useMemo(() => equitySeries(balance, 7), [balance]);
  const W = 720;
  const H = 160;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const x = (i: number) => (i / (pts.length - 1)) * W;
  const y = (v: number) => H - 8 - ((v - min) / (max - min || 1)) * (H - 24);
  const line = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb020" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffb020" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#1e222a" strokeDasharray="2 5" />
      ))}
      <path d={area} fill="url(#eq)" opacity={mounted ? 1 : 0} style={{ transition: "opacity .6s ease" }} />
      <motion.path
        d={line}
        fill="none"
        stroke="#ffb020"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />
    </svg>
  );
}

export default function OverviewPage() {
  const { me, mode, balance, refresh } = useSession();
  const { quotes, source } = useMarket();
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [deposits, setDeposits] = useState<Array<Record<string, unknown>> | null>(null);

  useEffect(() => {
    fetch("/api/trades").then((r) => r.json()).then((d) => setTrades(d.trades ?? []));
    fetch("/api/deposits").then((r) => r.json()).then((d) => setDeposits(d.deposits ?? []));
  }, []);

  const rows = trades ?? [];
  const open = rows.filter((t) => t.status === "open" && t.mode === mode);
  const closed = rows.filter((t) => t.status !== "open");
  const wins = closed.filter((t) => t.status === "won" || Number(t.pnl) > 0).length;
  const winRate = closed.length ? Math.round((wins / closed.length) * 100) : 0;
  const realised = closed.reduce((s, t) => s + Number(t.pnl), 0);
  const unrealised = open.reduce((s, t) => {
    const q = quotes[t.symbol]?.price ?? Number(t.entryPrice);
    const dir = t.side === "buy" || t.side === "up" ? 1 : -1;
    if (t.product === "binary") return s;
    return s + ((q - Number(t.entryPrice)) / Number(t.entryPrice)) * dir * Number(t.amount) * (t.leverage || 1);
  }, 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (me?.user.name ?? "trader").split(" ")[0];

  const pending = (deposits ?? []).filter((d) => d.status === "pending");

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hair pb-3">
        <div>
          <p className="label text-warm">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · {source === "LIVE" ? "live exchange feed" : "simulated feed"}
          </p>
          <h1 className="font-display text-3xl font-medium text-paper">
            {greeting}, {firstName}.
          </h1>
        </div>
        <div className="flex gap-2">
          <LinkBtn href="/dashboard/terminal" variant="primary">
            Open terminal
          </LinkBtn>
          <LinkBtn href="/dashboard/wallet">Deposit</LinkBtn>
        </div>
      </div>

      {/* equity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel
          title={mode === "demo" ? "Paper equity · 48h" : "Live equity · 48h"}
          right={<Pill tone="amber">{mode}</Pill>}
          bodyClass="p-3"
        >
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <div className="tnum font-mono text-[clamp(2.2rem,5vw,3.4rem)] leading-none text-amber">
                {fmtMoney(balance)}
              </div>
              <div className="mt-1 text-[11px] tracking-[0.14em] text-warm uppercase">
                realised {realised >= 0 ? "+" : ""}
                {fmtMoney(realised)} · unrealised {unrealised >= 0 ? "+" : ""}
                {fmtMoney(unrealised)}
              </div>
            </div>
            <div className="flex gap-6">
              <div>
                <div className="label text-warm">Open</div>
                <div className="tnum font-mono text-xl text-[#e7e5e1]">{open.length}</div>
              </div>
              <div>
                <div className="label text-warm">Win rate</div>
                <div className="tnum font-mono text-xl text-up">{winRate}%</div>
              </div>
              <div>
                <div className="label text-warm">Closed</div>
                <div className="tnum font-mono text-xl text-[#e7e5e1]">{closed.length}</div>
              </div>
            </div>
          </div>
          <div className="mt-3 border-t border-hair pt-2">
            <EquityCurve balance={balance} />
          </div>
        </Panel>

        <Panel title="Account status" bodyClass="divide-y divide-[#1e222a]">
          {[
            ["Mode", mode === "demo" ? "Paper trading" : "Live trading", mode === "demo" ? "amber" : "down"],
            ["Country", me?.user.country ?? "—", "neutral"],
            ["Active signals", String(me?.stats.signals ?? 0), "amber"],
            ["Pending deposits", String(pending.length), pending.length ? "amber" : "muted"],
          ].map(([k, v, tone]) => (
            <div key={k} className="flex items-center justify-between px-3 py-3">
              <span className="text-xs text-warm">{k}</span>
              <Pill tone={tone as "amber"}>{v}</Pill>
            </div>
          ))}
          <div className="p-3">
            <LinkBtn href="/dashboard/learn" className="w-full">
              Reset demo balance &amp; learn
            </LinkBtn>
          </div>
        </Panel>
      </div>

      {/* exposure + fills */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Open exposure" right={<Link href="/dashboard/terminal" className="text-[10px] tracking-widest text-amber uppercase">Trade →</Link>}>
          {trades === null ? (
            <Skeleton rows={3} />
          ) : open.length === 0 ? (
            <Empty
              title="Flat — no exposure"
              hint="Nothing is working for you right now. The terminal is one click away."
              action={
                <LinkBtn href="/dashboard/terminal" variant="primary" size="sm">
                  Place first trade
                </LinkBtn>
              }
            />
          ) : (
            open.map((t) => {
              const q = quotes[t.symbol]?.price ?? Number(t.entryPrice);
              const dir = t.side === "buy" || t.side === "up" ? 1 : -1;
              const upnl =
                t.product === "binary"
                  ? 0
                  : ((q - Number(t.entryPrice)) / Number(t.entryPrice)) * dir * Number(t.amount) * (t.leverage || 1);
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 border-b border-hair px-3 py-2.5 text-xs last:border-0">
                  <span>
                    <span className="font-semibold text-[#e7e5e1]">{t.symbol}</span>
                    <span className={` ml-2 text-[10px] font-bold uppercase ${dir === 1 ? "text-up" : "text-down"}`}>
                      {t.side}
                    </span>
                    <span className="block text-[10px] text-warm">
                      {fmtMoney(Number(t.amount))} @ {fmtPrice(Number(t.entryPrice), 4)}
                    </span>
                  </span>
                  <span className="text-right">
                    <Price symbol={t.symbol} decimals={4} className="block font-mono text-amber" />
                    <span className={`tnum font-mono ${upnl > 0 ? "text-up" : upnl < 0 ? "text-down" : "text-warm"}`}>
                      {t.product === "binary" ? "expiry pending" : `${upnl >= 0 ? "+" : ""}${fmtMoney(upnl)}`}
                    </span>
                  </span>
                </div>
              );
            })
          )}
        </Panel>

        <Panel title="Recent activity" right={<Link href="/dashboard/wallet" className="text-[10px] tracking-widest text-amber uppercase">Wallet →</Link>}>
          {!deposits ? (
            <Skeleton rows={3} />
          ) : deposits.length === 0 ? (
            <Empty title="No funding yet" hint="Deposits made with M-Pesa, USDT, Mastercard or Visa will show here with their settlement status." />
          ) : (
            deposits.slice(0, 6).map((d) => (
              <div key={String(d.id)} className="flex items-center justify-between gap-3 border-b border-hair px-3 py-2.5 text-xs last:border-0">
                <span>
                  <span className="font-semibold text-[#e7e5e1] uppercase">{String(d.method)}</span>
                  <span className="block font-mono text-[10px] text-warm">{String(d.reference)}</span>
                </span>
                <span className="text-right">
                  <span className="tnum block font-mono text-[#e7e5e1]">
                    {fmtMoney(Number(d.amount), String(d.currency))}
                  </span>
                  <Pill tone={d.status === "completed" ? "up" : d.status === "pending" ? "amber" : "down"}>
                    {String(d.status)}
                  </Pill>
                </span>
              </div>
            ))
          )}
        </Panel>
      </div>

      <Panel title="Quick watch">
        <div className="grid grid-cols-2 gap-px bg-hair sm:grid-cols-4">
          {(me?.watchlist ?? []).slice(0, 4).map((s) => (
            <div key={s} className="bg-panel px-3 py-3">
              <div className="text-[10px] tracking-[0.14em] text-warm uppercase">{s}</div>
              <div className="mt-1 font-mono text-base text-amber">
                <Price symbol={s} decimals={4} />
              </div>
            </div>
          ))}
          {(!me || me.watchlist.length === 0) && (
            <div className="col-span-full bg-panel px-3 py-5 text-center text-xs text-warm">
              Star a market on the Markets page to pin it here.
            </div>
          )}
        </div>
      </Panel>
      <div className="h-2" />
      <button className="sr-only" onClick={() => refresh()}>refresh</button>
    </div>
  );
}
