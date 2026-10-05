"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  eyebrow,
  title,
  lede,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      {/* plate */}
      <aside className="relative hidden overflow-hidden bg-ink lg:block">
        <img
          src="/images/rack.jpg"
          alt="Rack unit faceplate with amber indicators"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/70 to-ink" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" className="font-display text-3xl font-semibold tracking-tight text-paper">
            Meridian
          </Link>
          <div>
            <p className="max-w-[26ch] font-display text-[clamp(1.8rem,2.6vw,2.8rem)] leading-[1.08] text-paper italic">
              &ldquo;The tape does not care how you feel about it.&rdquo;
            </p>
            <p className="mt-4 text-[11px] tracking-[0.18em] text-warm uppercase">
              Meridian desk note · 04:00 EAT roll-over
            </p>
          </div>
          <div className="grid grid-cols-3 gap-px bg-hair">
            {[
              ["Markets", "16"],
              ["Products", "3"],
              ["Real funds", "Live"],
            ].map(([k, v]) => (
              <div key={k} className="bg-panel px-3 py-3">
                <div className="tnum font-mono text-xl text-amber">{v}</div>
                <div className="label mt-0.5 text-warm">{k}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* form */}
      <main className="paper flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-[420px]">
          <Link href="/" className="text-[11px] tracking-[0.18em] text-[#6b5f52] uppercase hover:text-news">
            ← Back to the broadsheet
          </Link>
          <p className="mt-8 text-[11px] tracking-[0.22em] text-[#9a5b12] uppercase">{eyebrow}</p>
          <h1 className="mt-2 font-display text-[2.6rem] leading-[1.02] font-medium tracking-[-0.02em]">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#5c5147]">{lede}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 border-t border-news/30 pt-4 text-xs text-[#5c5147]">{footer}</div>
        </div>
      </main>
    </div>
  );
}
