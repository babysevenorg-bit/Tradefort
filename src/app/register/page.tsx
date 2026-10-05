"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";

const COUNTRIES = ["Kenya", "Tanzania", "Uganda", "Nigeria", "Ghana", "South Africa", "Rwanda", "United Kingdom", "United Arab Emirates", "Other"];

function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", country: "Kenya" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  }

  const input =
    "h-11 w-full border border-news/40 bg-white/50 px-3 text-sm focus:border-news focus:bg-white";

  return (
    <AuthShell
      eyebrow="Open an account"
      title="Take the desk for a spin"
      lede="You start with a $100,000 paper balance, live pricing and the full signal feed. Deposit later — M-Pesa, USDT, Mastercard or Visa."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-[#9a5b12] underline underline-offset-2">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-semibold tracking-[0.16em] text-[#6b5f52] uppercase">
            Full name
          </span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Amani Wanjiru"
            className={input}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-semibold tracking-[0.16em] text-[#6b5f52] uppercase">
            Email
          </span>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            className={input}
          />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold tracking-[0.16em] text-[#6b5f52] uppercase">
              Country
            </span>
            <select
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className={input}
            >
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold tracking-[0.16em] text-[#6b5f52] uppercase">
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 6 characters"
              className={input}
            />
          </label>
        </div>

        {error && (
          <p className="border-l-2 border-[#c02338] bg-[#c023381a] px-3 py-2 text-xs text-[#8d1a2b]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full bg-news text-[13px] font-bold tracking-[0.16em] text-paper uppercase transition-colors hover:bg-[#9a5b12] disabled:opacity-50"
        >
          {loading ? "Opening account…" : "Open demo account"}
        </button>
        <p className="text-[11px] leading-relaxed text-[#6b5f52]">
          By opening an account you accept that leveraged trading can lose your full balance. The
          demo account is simulated and carries no monetary value.
        </p>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
