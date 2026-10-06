"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent, creds?: { email: string; password: string }) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds ?? { email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sign in failed");
      router.push(params.get("next") ?? "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Terminal access"
      title="Sign in to the desk"
      lede="Your session is stored in a signed, http-only cookie. Nothing about your account touches localStorage."
      footer={
        <>
          No account yet?{" "}
          <Link href="/register" className="font-semibold text-[#9a5b12] underline underline-offset-2">
            Open an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {params.get("reset") === "1" && (
          <p className="border-l-2 border-[#125c42] bg-[#0ecb811a] px-3 py-2 text-xs text-[#0a7d4f]">
            Your password was reset. Sign in with your new password.
          </p>
        )}
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-semibold tracking-[0.16em] text-[#6b5f52] uppercase">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 w-full border border-news/40 bg-white/50 px-3 text-sm focus:border-news focus:bg-white"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-semibold tracking-[0.16em] text-[#6b5f52] uppercase">
            Password
          </span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-11 w-full border border-news/40 bg-white/50 px-3 text-sm focus:border-news focus:bg-white"
          />
        </label>
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-[11px] font-semibold tracking-[0.06em] text-[#9a5b12] uppercase hover:underline"
          >
            Forgot password?
          </Link>
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
          {loading ? "Verifying…" : "Enter terminal"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
