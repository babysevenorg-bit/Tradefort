import Link from "next/link";
import { getMarket } from "@/lib/market";
import { SEED_INSTRUMENTS, fmtPrice } from "@/lib/market-core";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const METHODS = [
  { k: "M-Pesa", d: "Safaricom STK push · KES 100 min · settles in seconds" },
  { k: "USDT / BTC / ETH", d: "TRC20 · ERC20 · native · 12 confirmations" },
  { k: "Mastercard", d: "3-D Secure · USD · instant trading credit" },
  { k: "Visa", d: "3-D Secure · USD · instant trading credit" },
];

const DESKS = [
  ["01", "Real prices, not a game", "Crypto books stream from the live exchange. Forex, metals and indices run on institutional ticks with the same spread we quote the desk."],
  ["02", "Three products, one margin", "Spot, leveraged forex and 60-second binaries draw from a single balance — switch product in the ticket without moving funds."],
  ["03", "Signals with the numbers attached", "Every signal ships entry, stop, target and a confidence score. Copy it into the terminal in one click or retire it when the structure breaks."],
  ["04", "Start with real money", "Open a real account, deposit what you're comfortable risking via M-Pesa, USDT, Mastercard or Visa, and trade the live feed. No top-up, no resets — real funds, real risk."],
];

export default async function LandingPage() {
  const user = await currentUser();
  const market = await getMarket();
  const board = ["BTC/USDT", "ETH/USDT", "EUR/USD", "XAU/USD", "USD/KES", "NAS100"];
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="paper min-h-screen">
      {/* running head */}
      <div className="bg-ink text-[11px]">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-5 py-2">
          <span className="flex items-center gap-2 tracking-[0.18em] text-warm uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-up blink" />
            {market.source === "LIVE" ? "Live exchange feed" : "Simulated feed"} · {today}
          </span>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="tracking-[0.14em] text-warm uppercase transition-colors hover:text-amber">
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-amber px-3 py-1 font-semibold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-[#ffc24d]"
            >
              Open account
            </Link>
          </nav>
        </div>
      </div>

      {/* masthead */}
      <header className="mx-auto max-w-[1240px] px-5">
        <div className="border-b-[3px] border-news pt-8 pb-3">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-display text-[clamp(3.2rem,11vw,8.5rem)] leading-[0.82] font-semibold tracking-[-0.04em]">
              Meridian
            </h1>
            <p className="max-w-[24ch] pb-2 text-right text-[11px] leading-4 tracking-[0.2em] uppercase">
              Forex · Crypto · Binary
              <br />
              <span className="text-[#6b5f52]">Terminal — Nairobi desk</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-news/40 py-2 text-[10px] tracking-[0.18em] uppercase">
          <span>Est. 2019 · Licensed FX &amp; OTC derivatives</span>
          <span className="hidden sm:inline">Signals published in real time</span>
          <span>Real account · live funds</span>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-[1240px] grid-cols-1 gap-8 px-5 pt-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="mb-4 text-[11px] tracking-[0.22em] text-[#6b5f52] uppercase">
            The whole market, one ticket
          </p>
          <h2 className="font-display text-[clamp(2.4rem,5.4vw,4.6rem)] leading-[0.94] font-medium tracking-[-0.03em]">
            Trade the world&apos;s markets from a single terminal — and{" "}
            <em className="text-[#9a5b12] italic">learn on our money</em> before you risk a
            shilling.
          </h2>
          <p className="mt-6 max-w-[62ch] text-[17px] leading-[1.55] text-[#3a3128]">
            Meridian puts spot crypto, leveraged forex, indices and 60-second binary options on one
            balance sheet. Prices tick from the live exchange; signals arrive with entry, stop and
            target attached; and a real account lets you size each position to the cent and rehearse the whole thing until the
            clicks are automatic.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="inline-flex h-12 items-center bg-news px-6 text-[13px] font-bold tracking-[0.14em] text-paper uppercase transition-colors hover:bg-[#9a5b12]"
            >
              Open an account
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center border border-news/40 px-6 text-[13px] font-bold tracking-[0.14em] uppercase transition-colors hover:border-news hover:bg-news/5"
            >
              Enter the terminal
            </Link>
            <span className="text-[11px] tracking-[0.14em] text-[#6b5f52] uppercase">
              No card required
            </span>
          </div>
        </div>

        <figure className="relative lg:col-span-5">
          <div className="relative h-full min-h-[300px] overflow-hidden bg-ink">
            <img
              src="/images/desk.jpg"
              alt="Amber-glowing trading desk at night"
              className="h-full w-full object-cover object-center opacity-95 saturate-[1.15] contrast-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#ffb02026] via-[#08090a33] to-[#08090aaa]" />
            <div className="absolute inset-0 mix-blend-multiply bg-[#ffb0201a]" />
            <figcaption className="absolute right-3 bottom-3 left-3 border-l-2 border-amber bg-ink/80 px-3 py-2 text-[11px] leading-4 text-[#c9c4bc] backdrop-blur-sm">
              The Meridian desk, 03:14 EAT — gold session overlap, New York about to open.
            </figcaption>
          </div>
        </figure>
      </section>

      {/* live board */}
      <section className="mt-12 border-y-2 border-news bg-ink text-paper">
        <div className="mx-auto max-w-[1240px] px-5 py-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="label text-amber">Live board</h3>
            <span className="text-[10px] tracking-[0.18em] text-warm uppercase">
              {market.source === "LIVE" ? "Exchange · real time" : "Simulated · real time"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-[#1e222a] md:grid-cols-3 lg:grid-cols-6">
            {board.map((sym) => {
              const q = market.quotes[sym];
              const meta = SEED_INSTRUMENTS.find((i) => i.symbol === sym)!;
              const up = (q?.changePct ?? 0) >= 0;
              return (
                <div key={sym} className="bg-panel px-3 py-3">
                  <div className="text-[10px] tracking-[0.14em] text-warm uppercase">{sym}</div>
                  <div className="tnum mt-1 font-mono text-[19px] font-medium text-amber">
                    {q ? fmtPrice(q.price, meta.decimals) : "····"}
                  </div>
                  <div className={`tnum text-[11px] ${up ? "text-up" : "text-down"}`}>
                    {up ? "▲" : "▼"} {Math.abs(q?.changePct ?? 0).toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* editorial spread */}
      <section className="mx-auto max-w-[1240px] px-5 py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h3 className="font-display text-[2.4rem] leading-[1.02] font-medium tracking-[-0.02em]">
              Why the desk exists
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-[#4a4139]">
              Retail traders in Nairobi were forced to choose: a platform with real pricing but no
              local funding rail, or a local wallet with a fake chart. Meridian was built to refuse
              that trade-off.
            </p>
            <p className="mt-4 font-display text-lg leading-snug italic">
              &ldquo;Every number on this screen is a number you could have traded.&rdquo;
            </p>
          </div>
          <ol className="lg:col-span-8">
            {DESKS.map(([n, title, body]) => (
              <li
                key={n}
                className="grid grid-cols-[3rem_1fr] gap-4 border-t border-news/40 py-5 first:border-t-2 first:border-news"
              >
                <span className="font-mono text-sm text-[#9a5b12]">{n}</span>
                <div>
                  <h4 className="text-[17px] font-semibold tracking-tight">{title}</h4>
                  <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-[#4a4139]">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* markets table */}
      <section className="border-t border-news/40">
        <div className="mx-auto max-w-[1240px] px-5 py-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="font-display text-3xl font-medium">Markets</h3>
            <span className="text-[11px] tracking-[0.16em] text-[#6b5f52] uppercase">
              16 instruments · binary eligible
            </span>
          </div>
          <div className="overflow-x-auto border-t-2 border-news">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[10px] tracking-[0.16em] text-[#6b5f52] uppercase">
                  <th className="border-b border-news/40 py-2 pr-4 font-semibold">Instrument</th>
                  <th className="border-b border-news/40 py-2 pr-4 font-semibold">Class</th>
                  <th className="border-b border-news/40 py-2 pr-4 text-right font-semibold">Bid</th>
                  <th className="border-b border-news/40 py-2 pr-4 text-right font-semibold">24h</th>
                  <th className="border-b border-news/40 py-2 text-right font-semibold">Payout</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {SEED_INSTRUMENTS.map((inst) => {
                  const q = market.quotes[inst.symbol];
                  const up = (q?.changePct ?? 0) >= 0;
                  return (
                    <tr key={inst.symbol} className="transition-colors hover:bg-news/5">
                      <td className="border-b border-news/20 py-2 pr-4">
                        <span className="font-sans font-semibold">{inst.symbol}</span>
                        <span className="ml-2 font-sans text-xs text-[#6b5f52]">{inst.name}</span>
                      </td>
                      <td className="border-b border-news/20 py-2 pr-4 font-sans text-[11px] tracking-[0.12em] text-[#6b5f52] uppercase">
                        {inst.klass}
                      </td>
                      <td className="tnum border-b border-news/20 py-2 pr-4 text-right">
                        {q ? fmtPrice(q.price, inst.decimals) : "—"}
                      </td>
                      <td
                        className={`tnum border-b border-news/20 py-2 pr-4 text-right ${up ? "text-[#0a7a4f]" : "text-[#c02338]"}`}
                      >
                        {up ? "+" : ""}
                        {(q?.changePct ?? 0).toFixed(2)}%
                      </td>
                      <td className="border-b border-news/20 py-2 text-right">
                        {(inst.payoutBp / 100).toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* funding */}
      <section className="border-t-2 border-news bg-paper2/60">
        <div className="mx-auto max-w-[1240px] px-5 py-12">
          <h3 className="font-display text-3xl font-medium">Fund it the way you already pay</h3>
          <div className="mt-6 grid grid-cols-1 gap-px bg-news/25 sm:grid-cols-2 lg:grid-cols-4">
            {METHODS.map((m) => (
              <div key={m.k} className="bg-paper px-4 py-5">
                <div className="text-[13px] font-bold tracking-[0.1em] uppercase">{m.k}</div>
                <p className="mt-2 text-xs leading-relaxed text-[#5c5147]">{m.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* cta */}
      <section className="bg-ink text-paper">
        <div className="mx-auto flex max-w-[1240px] flex-col items-start gap-6 px-5 py-14 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-display text-[clamp(2rem,4vw,3.2rem)] leading-tight">
              Start with a real account.
            </h3>
            <p className="mt-2 max-w-[54ch] text-sm text-[#a7a196]">
              A real account carries identical pricing, identical spreads and identical signals.
              Deposit what you're comfortable risking — then trade the live feed.
            </p>
          </div>
          <Link
            href="/register"
            className="inline-flex h-13 shrink-0 items-center bg-amber px-7 py-4 text-[13px] font-bold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-[#ffc24d]"
          >
            Open account →
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#1e222a] bg-ink py-8 text-[11px] text-warm">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Meridian Terminal Ltd · Nairobi</span>
          <span className="max-w-[60ch]">
            Trading leveraged products carries risk of total loss. This is a real account — deposits and trades involve actual funds. Trade only what you can afford to lose.
          </span>
        </div>
      </footer>
    </div>
  );
}
// probe2 1791180531

// page probe 1791180593

// page probe 1791180703

// probe 1791180791

// page probe 1791180883

// page probe 1791181093
