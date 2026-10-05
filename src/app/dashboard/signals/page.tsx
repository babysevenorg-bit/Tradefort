"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useInstruments, useMarket, Price } from "@/components/market";
import { Btn, Empty, Field, Panel, Pill, Select, Skeleton } from "@/components/ui";
import { fmtPrice } from "@/lib/market-core";

type Signal = {
  id: number;
  symbol: string;
  klass: string;
  direction: string;
  timeframe: string;
  entry: string;
  stop: string;
  target: string;
  confidence: number;
  source: string;
  headline: string;
  note: string | null;
  status: string;
  createdAt: string;
  price?: number;
};

const FILTERS = ["active", "hit", "invalid", "all"] as const;

export default function SignalsPage() {
  const [list, setList] = useState<Signal[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("active");
  const [composer, setComposer] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const { instruments } = useInstruments();
  const { source } = useMarket();

  const load = useCallback(async () => {
    const res = await fetch("/api/signals", { cache: "no-store" });
    if (res.ok) setList((await res.json()).signals);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, [load]);

  const visible = (list ?? []).filter((s) => filter === "all" || s.status === filter);

  async function publish(payload: Record<string, unknown>) {
    const res = await fetch("/api/signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setComposer(false);
      await load();
    }
  }

  async function setStatus(id: number, status: string) {
    setList((prev) => (prev ? prev.map((s) => (s.id === id ? { ...s, status } : s)) : prev));
    await fetch(`/api/signals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function remove(id: number) {
    setList((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
    await fetch(`/api/signals/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hair pb-3">
        <div>
          <p className="label text-warm">
            Published by Meridian Quant &amp; partner desks · {source === "LIVE" ? "live" : "sim"} pricing
          </p>
          <h1 className="font-display text-3xl font-medium text-paper">Signals</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`h-8 border px-2.5 text-[10px] font-bold tracking-[0.12em] uppercase transition-colors ${
                  filter === f
                    ? "border-amber bg-amber/10 text-amber"
                    : "border-hair text-warm hover:text-[#e7e5e1]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <Btn variant="primary" onClick={() => setComposer(true)}>
            <Plus size={13} /> Publish
          </Btn>
        </div>
      </div>

      {list === null ? (
        <Skeleton rows={5} />
      ) : visible.length === 0 ? (
        <Panel>
          <Empty
            title={filter === "active" ? "No active signals" : `No ${filter} signals`}
            hint="Signals carry a symbol, direction, entry, stop, target and a confidence score. Publish one yourself to see how the desk formats it."
            action={
              <Btn variant="primary" size="sm" onClick={() => setComposer(true)}>
                Publish a signal
              </Btn>
            }
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {visible.map((s, i) => {
            const live = s.price ?? Number(s.entry);
            const dist = ((live - Number(s.entry)) / Number(s.entry)) * 100;
            const rr = Math.abs(Number(s.target) - Number(s.entry)) / Math.abs(Number(s.entry) - Number(s.stop));
            return (
              <motion.article
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(i * 0.04, 0.3) }}
                className="rack flex flex-col"
              >
                <header className="flex items-start justify-between gap-3 border-b border-hair bg-panel2 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-bold tracking-[0.14em] uppercase ${
                          s.direction === "long" ? "text-up" : "text-down"
                        }`}
                      >
                        {s.direction === "long" ? "▲ Long" : "▼ Short"}
                      </span>
                      <span className="font-mono text-sm font-semibold text-paper">{s.symbol}</span>
                      <Pill tone="neutral">{s.timeframe}</Pill>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#c3c8d0]">{s.headline}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Pill
                      tone={s.status === "active" ? "amber" : s.status === "hit" ? "up" : "muted"}
                    >
                      {s.status}
                    </Pill>
                    <div className="mt-1 text-[10px] text-warm">{s.source}</div>
                  </div>
                </header>

                <div className="grid grid-cols-4 gap-px bg-hair">
                  {[
                    ["Entry", fmtPrice(Number(s.entry), 5), "text-amber"],
                    ["Stop", fmtPrice(Number(s.stop), 5), "text-down"],
                    ["Target", fmtPrice(Number(s.target), 5), "text-up"],
                    ["Live", fmtPrice(live, 5), "text-[#e7e5e1]"],
                  ].map(([k, v, cls]) => (
                    <div key={k} className="bg-panel px-2 py-2">
                      <div className="label text-warm">{k}</div>
                      <div className={`tnum font-mono text-[13px] ${cls}`}>{v}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 px-3 py-2.5">
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="label text-warm">Confidence</span>
                    <span className="h-1.5 flex-1 bg-hair">
                      <motion.span
                        className="block h-1.5 bg-amber"
                        initial={{ width: 0 }}
                        animate={{ width: `${s.confidence}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </span>
                    <span className="tnum font-mono text-amber">{s.confidence}%</span>
                    <span className="tnum text-warm">
                      R:R {rr.toFixed(1)} · {dist >= 0 ? "+" : ""}
                      {dist.toFixed(2)}% from entry
                    </span>
                  </div>
                  {s.note && (
                    <p className="border-l-2 border-hair2 pl-2.5 font-display text-[13px] leading-snug text-[#a7a196] italic">
                      {s.note}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="tnum mr-auto font-mono text-[11px] text-warm">
                      live <Price symbol={s.symbol} decimals={5} />
                    </span>
                    {s.status !== "hit" && (
                      <Btn size="sm" variant="up" onClick={() => setStatus(s.id, "hit")}>
                        <Check size={11} /> Hit
                      </Btn>
                    )}
                    {s.status === "active" && (
                      <Btn size="sm" variant="danger" onClick={() => setStatus(s.id, "invalid")}>
                        <X size={11} /> Invalidate
                      </Btn>
                    )}
                    <Btn size="sm" onClick={() => setEditing(editing === s.id ? null : s.id)}>
                      <Pencil size={11} /> Edit
                    </Btn>
                    <button
                      onClick={() => remove(s.id)}
                      className="p-1.5 text-warm transition-colors hover:text-down"
                      title="Delete signal"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {editing === s.id && (
                    <EditForm
                      signal={s}
                      onDone={() => {
                        setEditing(null);
                        load();
                      }}
                    />
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {composer && (
          <Composer instruments={instruments} onClose={() => setComposer(false)} onPublish={publish} />
        )}
      </AnimatePresence>
      <div className="h-2" />
    </div>
  );
}

function Composer({
  instruments,
  onClose,
  onPublish,
}: {
  instruments: Array<{ symbol: string; name: string; price?: string }>;
  onClose: () => void;
  onPublish: (p: Record<string, unknown>) => Promise<void>;
}) {
  const { quotes } = useMarket();
  const [form, setForm] = useState({
    symbol: instruments[0]?.symbol ?? "BTC/USDT",
    direction: "long",
    timeframe: "H1",
    entry: "",
    stop: "",
    target: "",
    confidence: 72,
    headline: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);

  function autofill() {
    const q = quotes[form.symbol]?.price;
    if (!q) return;
    const entry = q;
    const long = form.direction === "long";
    setForm((f) => ({
      ...f,
      entry: entry.toFixed(5),
      stop: (long ? entry * 0.994 : entry * 1.006).toFixed(5),
      target: (long ? entry * 1.012 : entry * 0.988).toFixed(5),
    }));
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 14, opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="mt-8 w-full max-w-lg border border-hair2 bg-panel"
      >
        <header className="flex items-center justify-between border-b border-hair bg-panel2 px-3 py-2.5">
          <h2 className="label text-amber">Publish a signal</h2>
          <button onClick={onClose} className="text-warm hover:text-paper">
            <X size={15} />
          </button>
        </header>
        <div className="space-y-3 p-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Instrument" value={form.symbol} onChange={(v) => setForm({ ...form, symbol: v })}>
              {instruments.map((i) => (
                <option key={i.symbol} value={i.symbol}>
                  {i.symbol} — {i.name}
                </option>
              ))}
            </Select>
            <Select label="Direction" value={form.direction} onChange={(v) => setForm({ ...form, direction: v })}>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Timeframe" value={form.timeframe} onChange={(v) => setForm({ ...form, timeframe: v })}>
              {["M5", "M15", "M30", "H1", "H4", "D1"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
            <label className="block">
              <span className="label mb-1.5 block text-warm">Confidence · {form.confidence}%</span>
              <input
                type="range"
                min={1}
                max={99}
                value={form.confidence}
                onChange={(e) => setForm({ ...form, confidence: Number(e.target.value) })}
                className="mt-2 w-full accent-[#ffb020]"
              />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Entry" value={form.entry} onChange={(e) => setForm({ ...form, entry: e.target.value })} placeholder="1.08420" />
            <Field label="Stop" value={form.stop} onChange={(e) => setForm({ ...form, stop: e.target.value })} placeholder="1.08100" />
            <Field label="Target" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="1.09120" />
          </div>
          <button
            onClick={autofill}
            className="text-[10px] tracking-[0.14em] text-amber uppercase hover:underline"
          >
            ⟵ Fill levels from the live tape
          </button>
          <Field
            label="Headline"
            value={form.headline}
            onChange={(e) => setForm({ ...form, headline: e.target.value })}
            placeholder="EUR/USD bullish engulfing above 1.0840 handle"
          />
          <label className="block">
            <span className="label mb-1.5 block text-warm">Desk note</span>
            <textarea
              rows={3}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Structure, invalidation and how to scale out…"
              className="w-full border border-hair2 bg-ink px-3 py-2 text-sm text-[#e7e5e1] placeholder:text-[#4c5561] focus:border-amber"
            />
          </label>
          <Btn
            variant="primary"
            size="lg"
            className="w-full"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await onPublish(form);
              setBusy(false);
            }}
          >
            Publish to the feed
          </Btn>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EditForm({ signal, onDone }: { signal: Signal; onDone: () => void }) {
  const [confidence, setConfidence] = useState(signal.confidence);
  const [headline, setHeadline] = useState(signal.headline);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/signals/${signal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confidence, headline }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="space-y-2 border border-hair2 bg-ink p-2.5">
      <Field label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} />
      <label className="block">
        <span className="label mb-1.5 block text-warm">Confidence · {confidence}%</span>
        <input
          type="range"
          min={1}
          max={99}
          value={confidence}
          onChange={(e) => setConfidence(Number(e.target.value))}
          className="w-full accent-[#ffb020]"
        />
      </label>
      <div className="flex gap-2">
        <Btn size="sm" variant="primary" loading={saving} onClick={save}>
          Save changes
        </Btn>
        <Btn size="sm" onClick={onDone}>
          Cancel
        </Btn>
      </div>
    </div>
  );
}
