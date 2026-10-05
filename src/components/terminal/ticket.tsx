"use client";

import { useMemo, useState } from "react";
import { useMarket } from "@/components/market";
import { Btn } from "@/components/ui";
import { fmtPrice, fmtMoney } from "@/lib/market-core";

export type TicketResult = { ok: boolean; message: string };

const EXPIRIES = [
  { s: 30, label: "30s" },
  { s: 60, label: "60s" },
  { s: 300, label: "5m" },
  { s: 900, label: "15m" },
];

export function Ticket({
  symbol,
  decimals,
  mode,
  payoutBp,
  balance,
  onPlaced,
}: {
  symbol: string;
  decimals: number;
  mode: "demo" | "real";
  payoutBp: number;
  balance: number;
  onPlaced: (msg: string, tone: "ok" | "err") => void;
}) {
  const { quotes } = useMarket();
  const quote = quotes[symbol];
  const [product, setProduct] = useState<"spot" | "forex" | "binary">("spot");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("250");
  const [leverage, setLeverage] = useState(10);
  const [expiry, setExpiry] = useState(60);
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [busy, setBusy] = useState(false);

  const price = quote?.price ?? 0;
  const amt = Number(amount) || 0;
  const exposure = useMemo(() => (product === "binary" ? amt : amt * leverage), [amt, leverage, product]);
  const potential = useMemo(() => {
    if (product === "binary") return amt * (payoutBp / 10000);
    return amt * leverage * 0.02;
  }, [amt, leverage, product, payoutBp]);

  async function place() {
    if (!price) return onPlaced("No price for this instrument yet", "err");
    setBusy(true);
    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          product,
          side,
          amount: amt,
          mode,
          leverage,
          expirySeconds: expiry,
          stopLoss: stopLoss || null,
          takeProfit: takeProfit || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Order rejected");
      onPlaced(
        `${product === "binary" ? (side === "buy" ? "UP" : "DOWN") : side.toUpperCase()} ${fmtMoney(amt)} ${symbol} @ ${fmtPrice(price, decimals)}`,
        "ok",
      );
      setStopLoss("");
      setTakeProfit("");
    } catch (e) {
      onPlaced(e instanceof Error ? e.message : "Order rejected", "err");
    } finally {
      setBusy(false);
    }
  }

  const isBinary = product === "binary";
  const binarySide = side === "buy" ? "UP" : "DOWN";

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-3 border-b border-hair">
        {(["spot", "forex", "binary"] as const).map((p) => (
          <button
            key={p}
            onClick={() => {
              setProduct(p);
              if (p === "binary" && side === "buy") setSide("buy");
            }}
            className={`h-8 text-[10px] font-bold tracking-[0.14em] uppercase transition-colors ${
              product === p ? "bg-amber text-ink" : "text-warm hover:bg-panel2 hover:text-amber"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="space-y-3.5 p-3">
        <div className="flex items-baseline justify-between">
          <span className="label text-warm">{symbol}</span>
          <span className="tnum font-mono text-lg text-amber">
            {price ? fmtPrice(price, decimals) : "····"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {isBinary ? (
            <>
              <Btn
                variant={side === "buy" ? "up" : "ghost"}
                size="lg"
                onClick={() => setSide("buy")}
                className="h-12"
              >
                ▲ Up
              </Btn>
              <Btn
                variant={side === "sell" ? "down" : "ghost"}
                size="lg"
                onClick={() => setSide("sell")}
                className="h-12"
              >
                ▼ Down
              </Btn>
            </>
          ) : (
            <>
              <Btn variant={side === "buy" ? "up" : "ghost"} size="lg" onClick={() => setSide("buy")} className="h-12">
                Buy
              </Btn>
              <Btn variant={side === "sell" ? "down" : "ghost"} size="lg" onClick={() => setSide("sell")} className="h-12">
                Sell
              </Btn>
            </>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label text-warm">Stake</span>
            <span className="text-[10px] text-warm">avail {fmtMoney(balance)}</span>
          </div>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            className="tnum h-10 w-full border border-hair2 bg-ink px-3 font-mono text-base text-[#e7e5e1] focus:border-amber"
          />
          <div className="mt-1.5 grid grid-cols-4 gap-1">
            {[10, 50, 250, 1000].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className="h-6 border border-hair text-[10px] text-warm transition-colors hover:border-amber hover:text-amber"
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {isBinary ? (
          <div>
            <span className="label mb-1.5 block text-warm">Expiry</span>
            <div className="grid grid-cols-4 gap-1">
              {EXPIRIES.map((e) => (
                <button
                  key={e.s}
                  onClick={() => setExpiry(e.s)}
                  className={`h-8 border text-[11px] font-semibold transition-colors ${
                    expiry === e.s
                      ? "border-amber bg-amber/10 text-amber"
                      : "border-hair text-warm hover:border-hair2"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="label text-warm">Leverage</span>
              <span className="tnum font-mono text-xs text-amber">{leverage}×</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full accent-[#ffb020]"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="Stop loss"
                className="tnum h-8 w-full border border-hair bg-ink px-2 font-mono text-[11px] text-[#e7e5e1] placeholder:text-[#4c5561] focus:border-down"
              />
              <input
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="Take profit"
                className="tnum h-8 w-full border border-hair bg-ink px-2 font-mono text-[11px] text-[#e7e5e1] placeholder:text-[#4c5561] focus:border-up"
              />
            </div>
          </div>
        )}

        <div className="space-y-1 border border-hair bg-ink px-3 py-2 text-[11px]">
          <div className="flex justify-between">
            <span className="text-warm">Exposure</span>
            <span className="tnum font-mono text-[#e7e5e1]">{fmtMoney(exposure)}</span>
          </div>
          {isBinary && (
            <div className="flex justify-between">
              <span className="text-warm">Payout</span>
              <span className="tnum font-mono text-up">
                +{fmtMoney(potential)} · {(payoutBp / 100).toFixed(0)}%
              </span>
            </div>
          )}
          {!isBinary && (
            <div className="flex justify-between">
              <span className="text-warm">Req. margin</span>
              <span className="tnum font-mono text-[#e7e5e1]">{fmtMoney(amt)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-warm">{isBinary ? "Max loss" : "Est. 2% move"}</span>
            <span className={`tnum font-mono ${isBinary ? "text-down" : "text-up"}`}>
              {isBinary ? `−${fmtMoney(amt)}` : `+${fmtMoney(potential)}`}
            </span>
          </div>
        </div>

        <Btn
          variant={isBinary ? (side === "buy" ? "up" : "down") : side === "buy" ? "up" : "down"}
          size="lg"
          loading={busy}
          onClick={place}
          className="h-12 w-full"
        >
          {busy
            ? "Sending…"
            : isBinary
              ? `Place ${binarySide} · ${EXPIRIES.find((e) => e.s === expiry)?.label}`
              : `${side === "buy" ? "Buy" : "Sell"} ${symbol}`}
        </Btn>
        <p className="text-[10px] leading-relaxed text-warm">
          Live order — real balance will be debited on fill. Real funds at risk.
        </p>
      </div>
    </div>
  );
}
