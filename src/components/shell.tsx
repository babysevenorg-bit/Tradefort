"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  CandlestickChart,
  Radio,
  ListTree,
  Wallet,
  GraduationCap,
  LogOut,
  Menu,
  X,
  ArrowDownToLine,
} from "lucide-react";
import { TickerTape } from "@/components/market";
import { fmtMoney } from "@/lib/market-core";

type WalletRow = {
  id: number;
  currency: string;
  kind: string;
  label: string;
  balance: string;
  address: string | null;
};
type Me = {
  user: { id: number; name: string; email: string; country: string | null; accountMode: string };
  wallets: WalletRow[];
  watchlist: string[];
  stats: { open: number; closed: number; pnl: number; signals: number };
};

type Session = {
  me: Me | null;
  loading: boolean;
  mode: "demo" | "real";
  refresh: () => Promise<void>;
  setMode: (m: "demo" | "real") => Promise<void>;
  balance: number;
};

const Ctx = createContext<Session>({
  me: null,
  loading: true,
  mode: "demo",
  refresh: async () => {},
  setMode: async () => {},
  balance: 0,
});

export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (res.ok) setMe(await res.json());
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const mode: "demo" | "real" = me?.user.accountMode === "real" ? "real" : "demo";

  const setMode = useCallback(
    async (m: "demo" | "real") => {
      setMe((prev) => (prev ? { ...prev, user: { ...prev.user, accountMode: m } } : prev));
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountMode: m }),
      });
      await refresh();
    },
    [refresh],
  );

  const balance = useMemo(() => {
    if (!me) return 0;
    const w = me.wallets.find((x) => x.currency === "USD" && x.kind === mode);
    return Number(w?.balance ?? 0);
  }, [me, mode]);

  return (
    <Ctx.Provider value={{ me, loading, mode, refresh, setMode, balance }}>
      {children}
    </Ctx.Provider>
  );
}

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/terminal", label: "Trade terminal", icon: CandlestickChart },
  { href: "/dashboard/signals", label: "Signals", icon: Radio },
  { href: "/dashboard/markets", label: "Markets", icon: ListTree },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/learn", label: "Learn", icon: GraduationCap },
];

function Monogram() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
      <rect x="0.5" y="0.5" width="31" height="31" fill="#ffb020" />
      <path d="M6 24V8h4l6 9 6-9h4v16h-4v-8l-6 8-6-8v8H6z" fill="#08090a" />
    </svg>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me, mode, setMode, balance, refresh } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, [refresh]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-col gap-0.5 p-2">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`group flex items-center gap-3 border-l-2 px-3 py-2.5 text-[13px] transition-colors ${
              active
                ? "border-amber bg-panel2 font-semibold text-amber"
                : "border-transparent text-[#9aa3af] hover:border-hair2 hover:bg-panel2 hover:text-[#e7e5e1]"
            }`}
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
            {href === "/dashboard/signals" && me && me.stats.signals > 0 && (
              <span className="ml-auto tnum bg-amberdim/30 px-1.5 text-[10px] text-amber">
                {me.stats.signals}
              </span>
            )}
            {href === "/dashboard/terminal" && me && me.stats.open > 0 && (
              <span className="ml-auto tnum border border-hair2 px-1.5 text-[10px] text-warm">
                {me.stats.open}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const side = (
    <div className="flex h-full flex-col bg-panel">
      <Link href="/" className="flex items-center gap-2.5 border-b border-hair px-4 py-3.5">
        <Monogram />
        <span>
          <span className="block font-display text-lg leading-none font-semibold text-paper">
            Meridian
          </span>
          <span className="label text-warm">Terminal v4.2</span>
        </span>
      </Link>
      {nav}
      <div className="mt-auto border-t border-hair p-3">
        <div className="mb-3 border border-hair2 bg-ink px-3 py-2.5">
          <div className="label text-warm">{mode === "demo" ? "Paper equity" : "Live equity"}</div>
          <div className="tnum mt-1 font-mono text-xl text-amber">{fmtMoney(balance)}</div>
          <Link
            href="/dashboard/wallet"
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] tracking-wider text-warm uppercase hover:text-amber"
          >
            <ArrowDownToLine size={12} /> Deposit
          </Link>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-hair2 bg-panel2 text-[11px] font-bold text-amber">
            {(me?.user.name ?? "M")
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-[#e7e5e1]">
              {me?.user.name ?? "—"}
            </span>
            <span className="block truncate text-[11px] text-warm">{me?.user.email ?? ""}</span>
          </span>
          <button
            onClick={logout}
            title="Sign out"
            className="text-warm transition-colors hover:text-down"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink">
      {/* fixed rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] border-r border-hair lg:block">
        {side}
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 lg:hidden"
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "tween", duration: 0.18 }}
              className="fixed inset-y-0 left-0 z-50 w-[232px] border-r border-hair lg:hidden"
            >
              {side}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-[232px]">
        {/* top bar */}
        <header className="sticky top-0 z-30 border-b border-hair bg-ink/95 backdrop-blur">
          <div className="flex h-12 items-center gap-3 px-3 sm:px-4">
            <button
              onClick={() => setOpen(true)}
              className="text-warm hover:text-amber lg:hidden"
              aria-label="Open navigation"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>

            <div className="flex items-center border border-hair2">
              {(["demo", "real"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`h-7 px-2.5 text-[10px] font-bold tracking-[0.14em] uppercase transition-colors ${
                    mode === m
                      ? m === "demo"
                        ? "bg-amber text-ink"
                        : "bg-down text-ink"
                      : "text-warm hover:text-[#e7e5e1]"
                  }`}
                >
                  {m === "demo" ? "Demo" : "Real"}
                </button>
              ))}
            </div>

            <span className="hidden text-[11px] text-warm sm:inline">
              {mode === "demo"
                ? "Paper account — identical pricing, no risk"
                : "Live account — real funds at risk"}
            </span>

            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-right sm:block">
                <span className="label block text-warm">
                  {mode === "demo" ? "Paper equity" : "Live equity"}
                </span>
                <span className="tnum font-mono text-sm text-amber">{fmtMoney(balance)}</span>
              </span>
              <Link
                href="/dashboard/wallet"
                className="flex h-7 items-center gap-1.5 border border-amber px-2.5 text-[10px] font-bold tracking-[0.14em] text-amber uppercase hover:bg-amber hover:text-ink"
              >
                <ArrowDownToLine size={12} /> Deposit
              </Link>
            </div>
          </div>
          <TickerTape />
        </header>

        <main className="min-h-[calc(100vh-80px)]">{children}</main>
      </div>
    </div>
  );
}
