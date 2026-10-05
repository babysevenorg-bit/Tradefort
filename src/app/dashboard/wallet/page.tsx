"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Trash2, RefreshCcw, ArrowUpFromLine, Check } from "lucide-react";
import { useSession } from "@/components/shell";
import { Btn, Empty, Panel, Pill, Skeleton } from "@/components/ui";
import { fmtMoney } from "@/lib/market-core";

type Deposit = {
  id: number;
  method: string;
  amount: string;
  currency: string;
  reference: string;
  channelNote: string | null;
  status: string;
  createdAt: string;
  settledAt: string | null;
};

const METHODS = [
  { key: "mpesa", name: "M-Pesa", detail: "Safaricom STK push · KES", min: 100, cur: "KES" },
  { key: "usdt", name: "USDT", detail: "TRC20 · ERC20 · BEP20", min: 10, cur: "USDT" },
  { key: "btc", name: "Bitcoin", detail: "Native on-chain · 12 conf", min: 0.0001, cur: "BTC" },
  { key: "eth", name: "Ethereum", detail: "ERC20 · 12 conf", min: 0.001, cur: "ETH" },
  { key: "mastercard", name: "Mastercard", detail: "3-D Secure · instant", min: 10, cur: "USD" },
  { key: "visa", name: "Visa", detail: "3-D Secure · instant", min: 10, cur: "USD" },
];

const ADDRESSES: Record<string, string> = {
  usdt: "TQ7mN4xVb2kR9sYgHdW3pLuZcE5aXn1JvF",
  btc: "bc1qk3m9x2v7fr4d0ps6uz8ya5wtnq7hj2",
  eth: "0x4C9a2f7B1d8E6a3F5b0C2d9A7e4B1f8C3a6D2E10",
};

function QR({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    const N = 25;
    let h = 2166136261;
    const out: boolean[] = [];
    for (let i = 0; i < N * N; i++) {
      const ch = seed.charCodeAt(i % seed.length) + i;
      h ^= ch;
      h = Math.imul(h, 16777619);
      out.push(((h >>> 0) % 100) > 52);
    }
    return out;
  }, [seed]);
  const N = 25;
  return (
    <svg viewBox={`0 0 ${N} ${N}`} className="h-32 w-32 bg-paper p-1" shapeRendering="crispEdges">
      {cells.map((on, i) =>
        on ? (
          <rect key={i} x={i % N} y={Math.floor(i / N)} width="1" height="1" fill="#08090a" />
        ) : null,
      )}
      {[
        [0, 0],
        [N - 7, 0],
        [0, N - 7],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="7" height="7" fill="none" stroke="#08090a" strokeWidth="1" />
          <rect x={x + 2} y={y + 2} width="3" height="3" fill="#08090a" />
        </g>
      ))}
    </svg>
  );
}

export default function WalletPage() {
  const { me, refresh, loading } = useSession();
  const [deposits, setDeposits] = useState<Deposit[] | null>(null);
  const [modal, setModal] = useState<null | "deposit" | "withdraw">(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/deposits", { cache: "no-store" });
    if (res.ok) setDeposits((await res.json()).deposits);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const wallets = me?.wallets ?? [];

  async function cancel(id: number) {
    setDeposits((p) => (p ? p.filter((d) => d.id !== id) : p));
    await fetch(`/api/deposits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    await load();
    await refresh();
  }

  async function settle(id: number) {
    await fetch(`/api/deposits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "settle" }),
    });
    await load();
    await refresh();
  }

  async function remove(id: number) {
    setDeposits((p) => (p ? p.filter((d) => d.id !== id) : p));
    await fetch(`/api/deposits/${id}`, { method: "DELETE" });
    await load();
  }

  const pending = (deposits ?? []).filter((d) => d.status === "pending");

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hair pb-3">
        <div>
          <p className="label text-warm">M-Pesa · USDT · BTC · ETH · Mastercard · Visa</p>
          <h1 className="font-display text-3xl font-medium text-paper">Wallet</h1>
        </div>
        <div className="flex gap-2">
          <Btn variant="primary" onClick={() => setModal("deposit")}>
            Deposit funds
          </Btn>
          <Btn onClick={() => setModal("withdraw")}>
            <ArrowUpFromLine size={13} /> Withdraw
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px bg-hair sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse bg-panel" />
            ))
          : wallets.map((w) => (
              <div key={w.id} className="bg-panel px-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-[0.16em] text-warm uppercase">
                    {w.currency}
                  </span>
                  <Pill tone={w.kind === "demo" ? "amber" : "up"}>{w.kind}</Pill>
                </div>
                <div className="tnum mt-2 font-mono text-2xl text-amber">
                  {fmtMoney(Number(w.balance), w.currency)}
                </div>
                <div className="mt-1 truncate text-[11px] text-warm">{w.label}</div>
                {w.address && (
                  <div className="mt-1 truncate font-mono text-[10px] text-[#5c6470]">{w.address}</div>
                )}
              </div>
            ))}
      </div>

      <Panel
        title="Funding history"
        right={
          <div className="flex items-center gap-2">
            {pending.length > 0 && (
              <span className="text-[10px] tracking-widest text-amber uppercase">
                {pending.length} awaiting settlement
              </span>
            )}
            <button onClick={load} className="text-warm hover:text-amber" title="Refresh">
              <RefreshCcw size={12} />
            </button>
          </div>
        }
      >
        {deposits === null ? (
          <Skeleton rows={5} />
        ) : deposits.length === 0 ? (
          <Empty
            title="No transactions yet"
            hint="Fund the account with M-Pesa from a Kenyan number, crypto to a dedicated address, or a Mastercard / Visa card. Settlements appear here with their reference."
            action={
              <Btn variant="primary" size="sm" onClick={() => setModal("deposit")}>
                Make a deposit
              </Btn>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-xs">
              <thead className="bg-panel2">
                <tr className="text-left text-[10px] tracking-[0.14em] text-warm uppercase">
                  {["Method", "Reference", "Amount", "Channel", "Status", "When", ""].map((h) => (
                    <th key={h} className="border-b border-hair px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deposits.map((d) => {
                  const isWd = d.method.startsWith("withdraw:");
                  return (
                    <tr key={d.id} className="border-b border-hair transition-colors hover:bg-panel2">
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-[#e7e5e1] uppercase">
                          {isWd ? `↑ ${d.method.split(":")[1]} withdrawal` : d.method}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-warm">{d.reference}</td>
                      <td className={`tnum px-3 py-2.5 font-mono ${isWd ? "text-down" : "text-[#e7e5e1]"}`}>
                        {isWd ? "−" : "+"}
                        {fmtMoney(Number(d.amount), d.currency)}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-warm">{d.channelNote ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <Pill tone={d.status === "completed" ? "up" : d.status === "pending" ? "amber" : "down"}>
                          {d.status}
                        </Pill>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-warm">
                        {new Date(d.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          {d.status === "pending" && (
                            <>
                              <Btn size="sm" variant="up" onClick={() => settle(d.id)}>
                                <Check size={11} /> Settle
                              </Btn>
                              <Btn size="sm" variant="danger" onClick={() => cancel(d.id)}>
                                Cancel
                              </Btn>
                            </>
                          )}
                          {d.status !== "pending" && (
                            <button
                              onClick={() => remove(d.id)}
                              className="p-1.5 text-warm transition-colors hover:text-down"
                              title="Delete record"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <AnimatePresence>
        {modal && (
          <FundingModal
            kind={modal}
            onClose={() => setModal(null)}
            onDone={async () => {
              await load();
              await refresh();
            }}
          />
        )}
      </AnimatePresence>
      <div className="h-2" />
    </div>
  );
}

function FundingModal({
  kind,
  onClose,
  onDone,
}: {
  kind: "deposit" | "withdraw";
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [method, setMethod] = useState<string | null>(kind === "deposit" ? null : "mpesa");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("0722 000 418");
  const [card, setCard] = useState({ number: "", exp: "", cvc: "" });
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"choose" | "details" | "waiting" | "done">(
    kind === "withdraw" ? "details" : "choose",
  );
  const [reference, setReference] = useState("");

  const spec = METHODS.find((m) => m.key === method);
  const min = kind === "withdraw" ? 10 : (spec?.min ?? 10);
  const isCard = method === "mastercard" || method === "visa";

  async function submit() {
    if (!spec && kind === "deposit") return;
    setBusy(true);
    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "withdraw"
            ? { direction: "withdraw", method, amount: Number(amount), channelNote: `To ${phone}` }
            : {
                method,
                amount: Number(amount),
                channelNote: isCard
                  ? `${spec?.name} •••• ${card.number.slice(-4) || "0000"}`
                  : method === "mpesa"
                    ? `Safaricom ${phone}`
                    : spec?.detail,
              },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setReference(data.deposit.reference);
      await onDone();
      if (kind === "withdraw") {
        setStep("done");
      } else {
        setStep("waiting");
        setTimeout(async () => {
          await fetch(`/api/deposits/${data.deposit.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "settle" }),
          });
          await onDone();
          setStep("done");
        }, 2600);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="mt-10 w-full max-w-xl border border-hair2 bg-panel"
      >
        <header className="flex items-center justify-between border-b border-hair bg-panel2 px-3 py-2.5">
          <div>
            <h2 className="label text-amber">
              {kind === "deposit" ? "Deposit funds" : "Withdraw to your channel"}
            </h2>
            <p className="mt-0.5 text-[10px] text-warm">
              {step === "choose" ? "1 · Choose a rail" : step === "details" ? "2 · Confirm the details" : step === "waiting" ? "3 · Awaiting confirmation" : "Settled"}
            </p>
          </div>
          <button onClick={onClose} className="text-warm hover:text-paper">
            <X size={16} />
          </button>
        </header>

        <div className="p-4">
          {step === "choose" && (
            <div className="grid grid-cols-1 gap-px bg-hair sm:grid-cols-2">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setMethod(m.key);
                    setStep("details");
                  }}
                  className="group bg-panel px-4 py-4 text-left transition-colors hover:bg-panel2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold tracking-[0.08em] text-[#e7e5e1] uppercase group-hover:text-amber">
                      {m.name}
                    </span>
                    <span className="text-[10px] text-warm">{m.cur}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-warm">{m.detail}</div>
                  <div className="mt-2 text-[10px] tracking-widest text-amberdim uppercase">
                    min {m.min} {m.cur}
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === "details" && spec && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border border-hair bg-ink px-3 py-2">
                <div>
                  <div className="text-sm font-bold tracking-wide uppercase">{spec.name}</div>
                  <div className="text-[11px] text-warm">{spec.detail}</div>
                </div>
                <button
                  onClick={() => (kind === "deposit" ? setStep("choose") : undefined)}
                  className="text-[10px] tracking-widest text-amber uppercase"
                >
                  {kind === "deposit" ? "change" : ""}
                </button>
              </div>

              <label className="block">
                <span className="label mb-1.5 block text-warm">
                  Amount · min {min} {spec.cur}
                </span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder={String(min * 10)}
                  className="tnum h-11 w-full border border-hair2 bg-ink px-3 font-mono text-lg text-[#e7e5e1] focus:border-amber"
                />
              </label>

              {method === "mpesa" && (
                <label className="block">
                  <span className="label mb-1.5 block text-warm">M-Pesa number</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XX XXX XXX"
                    className="tnum h-11 w-full border border-hair2 bg-ink px-3 font-mono text-sm text-[#e7e5e1] focus:border-amber"
                  />
                  <span className="mt-1 block text-[11px] text-warm">
                    You will receive an STK push — enter your PIN on the handset to approve.
                  </span>
                </label>
              )}

              {(method === "usdt" || method === "btc" || method === "eth") && (
                <div className="flex flex-col gap-3 border border-hair bg-ink p-3 sm:flex-row">
                  <QR seed={`${method}${amount || "1"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="label text-warm">Send only {spec.name} to</div>
                    <p className="mt-1 break-all font-mono text-[11px] text-amber">
                      {ADDRESSES[method!]}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-warm">
                      Credit is applied after {method === "eth" ? "12" : "12"} confirmations,
                      typically under two minutes. Wrong-asset deposits cannot be recovered.
                    </p>
                  </div>
                </div>
              )}

              {isCard && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="col-span-2 block">
                    <span className="label mb-1.5 block text-warm">Card number</span>
                    <input
                      value={card.number}
                      onChange={(e) =>
                        setCard({
                          ...card,
                          number: e.target.value.replace(/[^\d]/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim(),
                        })
                      }
                      placeholder="5412 7534 9821 0041"
                      className="tnum h-11 w-full border border-hair2 bg-ink px-3 font-mono text-sm text-[#e7e5e1] focus:border-amber"
                    />
                  </label>
                  <label className="block">
                    <span className="label mb-1.5 block text-warm">Expiry</span>
                    <input
                      value={card.exp}
                      onChange={(e) => setCard({ ...card, exp: e.target.value.slice(0, 5) })}
                      placeholder="09/28"
                      className="tnum h-11 w-full border border-hair2 bg-ink px-3 font-mono text-sm text-[#e7e5e1] focus:border-amber"
                    />
                  </label>
                  <label className="block">
                    <span className="label mb-1.5 block text-warm">CVC</span>
                    <input
                      value={card.cvc}
                      onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      placeholder="418"
                      className="tnum h-11 w-full border border-hair2 bg-ink px-3 font-mono text-sm text-[#e7e5e1] focus:border-amber"
                    />
                  </label>
                  <p className="col-span-2 text-[11px] text-warm">
                    3-D Secure will be triggered with your issuing bank. Cards are charged in USD.
                  </p>
                </div>
              )}

              <Btn variant="primary" size="lg" className="w-full" loading={busy} onClick={submit}>
                {kind === "withdraw"
                  ? `Withdraw ${amount ? fmtMoney(Number(amount)) : "…" }`
                  : method === "mpesa"
                    ? "Send STK push"
                    : isCard
                      ? `Pay ${amount ? fmtMoney(Number(amount)) : "…"}`
                      : "Confirm deposit"}
              </Btn>
            </div>
          )}

          {step === "waiting" && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full border-2 border-hair" />
                <div
                  className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-amber"
                  style={{ animationDuration: "1.1s" }}
                />
              </div>
              <p className="text-sm text-[#e7e5e1]">
                {method === "mpesa" ? "STK push sent — enter your M-Pesa PIN" : "Waiting for confirmation"}
              </p>
              <p className="font-mono text-[11px] text-warm">REF {reference}</p>
              <div className="mt-2 h-1 w-56 bg-hair">
                <motion.div
                  className="h-1 bg-amber"
                  initial={{ width: "5%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.6 }}
                />
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center border-2 border-up text-up">
                <Check size={26} />
              </span>
              <p className="font-display text-2xl text-paper">
                {kind === "withdraw" ? "Withdrawal queued" : "Funds credited"}
              </p>
              <p className="max-w-sm text-xs leading-relaxed text-warm">
                {kind === "withdraw"
                  ? `We are moving ${fmtMoney(Number(amount || 0))} to your channel. Most M-Pesa payouts settle within minutes.`
                  : `${fmtMoney(Number(amount || 0), spec?.cur)} received. Your trading balance is live — open the terminal.`}
              </p>
              <p className="font-mono text-[11px] text-amber">REF {reference}</p>
              <Btn variant="primary" onClick={onClose}>
                Done
              </Btn>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
