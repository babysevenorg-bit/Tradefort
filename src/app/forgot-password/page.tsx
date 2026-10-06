"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      lede="Enter your account email and we'll send a one-time reset link. The link expires in 1 hour."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-[#9a5b12] underline underline-offset-2">
            Back to sign in
          </Link>
        </>
      }
    >
      {done ? (
        <div className="border-l-2 border-[#125c42] bg-[#0ecb811a] px-3 py-3 text-xs leading-relaxed text-[#0ecb81]">
          If an account exists for <span className="font-mono">{email}</span>, a reset link is on its
          way. Check your inbox (and spam folder).
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
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
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
