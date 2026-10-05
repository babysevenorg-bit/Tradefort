"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, RotateCcw, Award } from "lucide-react";
import { Btn, Panel, Pill } from "@/components/ui";
import { useSession } from "@/components/shell";
import { fmtMoney } from "@/lib/market-core";

const LESSONS = [
  {
    id: "l1",
    title: "Reading the ticket",
    meta: "3 min · basics",
    body: "Every order on Meridian carries four numbers: instrument, side, stake and (for leveraged products) leverage. The stake is the maximum you can lose — it is debited from your balance at fill. Leverage multiplies the position size, not the loss: at 10× a $250 stake controls $2,500 of exposure, so a 1% adverse move costs $25.",
  },
  {
    id: "l2",
    title: "Pips, spreads and the 5-decimal quote",
    meta: "4 min · forex",
    body: "EUR/USD at 1.08642 — the fourth decimal is a pip (0.0001), so a move to 1.08742 is +10 pips. The fifth digit is a pipette and lets us quote a tighter spread. On USD/KES the pip is the second decimal (0.01) because the quote is a rate above 100; our spread there is 0.06, about six shillings.",
  },
  {
    id: "l3",
    title: "Binary payouts, honestly",
    meta: "5 min · binary",
    body: "A binary pays a fixed percentage of your stake if you are right at expiry. At 87% you need roughly 54 wins in 100 just to break even: 0.54 × 87 − 0.46 × 100 = −2.14. The edge comes from taking only setups where your read of the structure is materially better than a coin flip — not from trading more often.",
  },
  {
    id: "l4",
    title: "One percent, every time",
    meta: "4 min · risk",
    body: "Risk no more than 1% of equity on a single idea. On a $100,000 demo balance that is $1,000 of maximum pain — size the position backwards from your stop distance, never forwards from your greed. Ten consecutive losses at 1% cost you 9.6%; twenty consecutive losses at 5% cost you 64%.",
  },
  {
    id: "l5",
    title: "Funding from Kenya",
    meta: "2 min · deposits",
    body: "M-Pesa pushes a prompt to your handset and the KES lands in your shilling wallet, converted to trading USD at the live USD/KES rate. Crypto rails credit after 12 confirmations; Mastercard and Visa settle instantly through 3-D Secure. Withdrawals run back down the same channel you deposited from.",
  },
];

const QUIZ = [
  {
    q: "You buy $500 of BTC/USDT at 20× leverage. Price falls 2%. What is your P&L?",
    options: ["−$10", "−$200", "−$2,000", "−$500"],
    answer: 1,
    why: "500 × 20 × 0.02 = $2,000 of position movement — but a stop-out caps the loss at your stake. Without a stop the move costs $2,000 against a $500 stake, so the position would be liquidated first. Loss is capped at the stake.",
  },
  {
    q: "A binary pays 87%. Roughly what win rate do you need to break even?",
    options: ["50%", "54%", "60%", "87%"],
    answer: 1,
    why: "0.87w − (1−w) = 0 → w = 1/1.87 ≈ 53.5%, so about 54 wins in 100.",
  },
  {
    q: "EUR/USD moves from 1.08642 to 1.08742. That is…",
    options: ["1 pip", "10 pips", "100 pips", "0.1 pip"],
    answer: 1,
    why: "The fourth decimal is the pip: 1.08742 − 1.08642 = 0.00100 = 10 pips.",
  },
  {
    q: "What is the point of the demo account?",
    options: [
      "To guarantee future returns",
      "To rehearse the full workflow against live prices with no funds at risk",
      "To get a larger leverage cap",
      "To skip identity checks",
    ],
    answer: 1,
    why: "The paper balance uses identical pricing, spreads and signals so the mechanics become automatic before real money is at stake.",
  },
];

export default function LearnPage() {
  const { refresh } = useSession();
  const [open, setOpen] = useState<string | null>("l1");
  const [done, setDone] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const score = QUIZ.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);
  const progress = Math.round((done.length / LESSONS.length) * 100);

  async function resetDemo() {
    setResetting(true);
    const res = await fetch("/api/wallets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    setResetting(false);
    if (res.ok) {
      setBanner("Paper balance reset to $100,000.00 — fresh slate, same live prices.");
      await refresh();
      setTimeout(() => setBanner(null), 5000);
    } else {
      setBanner("Could not reset the balance. Try again.");
    }
  }

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div className="border-b border-hair pb-3">
        <p className="label text-warm">Paper-account academy · five short lessons · four questions</p>
        <h1 className="font-display text-3xl font-medium text-paper">Learn the desk</h1>
      </div>

      <AnimatePresence>
        {banner && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border-l-2 border-amber bg-amber/10 px-3 py-2 text-xs text-amber"
          >
            {banner}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Panel
            title="Curriculum"
            right={
              <div className="flex items-center gap-2">
                <span className="h-1 w-24 bg-hair">
                  <span className="block h-1 bg-amber transition-all duration-500" style={{ width: `${progress}%` }} />
                </span>
                <span className="tnum text-[10px] text-amber">{progress}%</span>
              </div>
            }
          >
            {LESSONS.map((l, i) => {
              const isOpen = open === l.id;
              const complete = done.includes(l.id);
              return (
                <div key={l.id} className="border-b border-hair last:border-0">
                  <button
                    onClick={() => setOpen(isOpen ? null : l.id)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-panel2"
                  >
                    <span
                      className={`tnum flex h-6 w-6 shrink-0 items-center justify-center border text-[10px] font-bold ${
                        complete ? "border-up bg-up/15 text-up" : "border-hair2 text-warm"
                      }`}
                    >
                      {complete ? "✓" : String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[#e7e5e1]">{l.title}</span>
                      <span className="block text-[11px] text-warm">{l.meta}</span>
                    </span>
                    <ChevronDown
                      size={15}
                      className={`shrink-0 text-warm transition-transform ${isOpen ? "rotate-180 text-amber" : ""}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-4 pl-12">
                          <p className="max-w-[70ch] text-[13px] leading-relaxed text-[#a7a196]">{l.body}</p>
                          <button
                            onClick={() =>
                              setDone((p) => (p.includes(l.id) ? p.filter((x) => x !== l.id) : [...p, l.id]))
                            }
                            className={`mt-3 text-[10px] font-bold tracking-[0.14em] uppercase ${
                              complete ? "text-up" : "text-amber hover:underline"
                            }`}
                          >
                            {complete ? "✓ Completed — mark as unread" : "Mark as completed"}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </Panel>

          <div className="relative overflow-hidden border border-hair bg-paper">
            <img src="/images/blueprint.jpg" alt="Blueprint plate of a candlestick chart" className="h-52 w-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
            <p className="absolute right-4 bottom-3 left-4 font-display text-lg text-paper italic">
              Plate IV — the anatomy of a single 15-second candle: open, high, low, close.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Panel title="Check your understanding" right={<Pill tone={submitted ? (score >= 3 ? "up" : "down") : "amber"}>{submitted ? `${score}/${QUIZ.length}` : "ungraded"}</Pill>}>
            <div className="space-y-4 p-3">
              {QUIZ.map((q, qi) => (
                <div key={qi}>
                  <p className="text-[13px] leading-snug text-[#e7e5e1]">
                    <span className="mr-1.5 font-mono text-amber">{qi + 1}.</span>
                    {q.q}
                  </p>
                  <div className="mt-2 space-y-1">
                    {q.options.map((opt, oi) => {
                      const picked = answers[qi] === oi;
                      const correct = submitted && oi === q.answer;
                      const wrong = submitted && picked && oi !== q.answer;
                      return (
                        <button
                          key={oi}
                          onClick={() => !submitted && setAnswers({ ...answers, [qi]: oi })}
                          className={`flex w-full items-center gap-2 border px-2.5 py-2 text-left text-xs transition-colors ${
                            correct
                              ? "border-up bg-up/10 text-up"
                              : wrong
                                ? "border-down bg-down/10 text-down"
                                : picked
                                  ? "border-amber bg-amber/10 text-amber"
                                  : "border-hair text-[#a7a196] hover:border-hair2 hover:text-[#e7e5e1]"
                          }`}
                        >
                          <span className="font-mono text-[10px]">{"ABCD"[oi]}</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {submitted && (
                    <p className="mt-1.5 border-l-2 border-hair2 pl-2 text-[11px] leading-relaxed text-warm">
                      {q.why}
                    </p>
                  )}
                </div>
              ))}
              {!submitted ? (
                <Btn
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={Object.keys(answers).length < QUIZ.length}
                  onClick={() => setSubmitted(true)}
                >
                  {Object.keys(answers).length < QUIZ.length
                    ? `Answer ${QUIZ.length - Object.keys(answers).length} more`
                    : "Grade the quiz"}
                </Btn>
              ) : (
                <div className="flex items-center gap-3 border border-hair2 bg-ink px-3 py-3">
                  <Award size={22} className={score >= 3 ? "text-up" : "text-amber"} />
                  <p className="text-xs text-[#a7a196]">
                    {score >= 3
                      ? "Sharp. The demo balance is yours to trade — switch the ticket to Real when the mechanics feel boring."
                      : "Worth a second pass on lessons 2 and 3 — payout maths and pip arithmetic decide whether this is a business or a hobby."}
                  </p>
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Paper account">
            <div className="space-y-3 p-3">
              <div className="border border-hair bg-ink px-3 py-3">
                <div className="label text-warm">Current paper balance</div>
                <div className="tnum mt-1 font-mono text-2xl text-amber">{fmtMoney(100000)}</div>
                <p className="mt-1 text-[11px] leading-relaxed text-warm">
                  Identical pricing to the live desk. A reset restores the $100,000 starting balance
                  and cancels every open paper position — settled trades and funding records stay on
                  the tape for review.
                </p>
              </div>
              <Btn variant="primary" size="lg" className="w-full" loading={resetting} onClick={resetDemo}>
                <RotateCcw size={14} /> Reset demo balance
              </Btn>
            </div>
          </Panel>
        </div>
      </div>
      <div className="h-2" />
    </div>
  );
}
