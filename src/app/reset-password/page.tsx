"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reset failed");
      // Success → send them to sign in with their new password.
      router.push("/login?reset=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="border-l-2 border-[#c02338] bg-[#c023381a] px-3 py-3 text-xs leading-relaxed text-[#8d1a2b]">
        This reset link is missing its token. Use the link from your reset email, or request a{" "}
        <Link href="/forgot-password" className="font-semibold underline">
          new reset link
        </Link>
        .
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-semibold tracking-[0.16em] text-[#6b5f52] uppercase">
          New password
        </span>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          className="h-11 w-full border border-news/40 bg-white/50 px-3 text-sm focus:border-news focus:bg-white"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-semibold tracking-[0.16em] text-[#6b5f52] uppercase">
          Confirm password
        </span>
        <input
          type="password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter the new password"
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
        {loading ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Choose a new password"
      lede="Set a new password for your Tradefort account. This reset link is single-use and expires in 1 hour."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-[#9a5b12] underline underline-offset-2">
            Back to sign in
          </Link>
        </>
      }
    >
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
