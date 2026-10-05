"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function LinkBtn({
  href,
  variant,
  size,
  children,
  className = "",
}: {
  href: string;
  variant?: NonNullable<BtnProps["variant"]>;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${btnClass(variant, size)} ${className}`}>
      {children}
    </Link>
  );
}

export function Panel({
  title,
  right,
  children,
  className = "",
  bodyClass = "",
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={`rack ${className}`}>
      {title && (
        <header className="flex h-9 items-center justify-between gap-3 border-b border-hair bg-panel2 px-3">
          <h2 className="label text-warm">{title}</h2>
          {right}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "up" | "down" | "quiet";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export const btnSize = (size: "sm" | "md" | "lg" = "md") =>
  ({ sm: "h-7 px-2 text-[11px]", md: "h-9 px-3.5 text-xs", lg: "h-11 px-5 text-sm" })[size];

export const btnVariant = (variant: NonNullable<BtnProps["variant"]> = "ghost") =>
  ({
    primary: "bg-amber text-ink hover:bg-[#ffc24d] font-bold border border-amber",
    ghost: "border border-hair2 text-[#e7e5e1] hover:border-amber hover:text-amber",
    quiet: "border border-transparent text-warm hover:text-amber",
    danger: "border border-[#5a1f28] text-down hover:bg-[#f6465d1a] hover:border-down",
    up: "border border-[#125c42] bg-[#0ecb811a] text-up hover:bg-[#0ecb8133]",
    down: "border border-[#5a1f28] bg-[#f6465d1a] text-down hover:bg-[#f6465d33]",
  })[variant];

export const btnClass = (variant?: NonNullable<BtnProps["variant"]>, size?: "sm" | "md" | "lg") =>
  `inline-flex items-center justify-center gap-2 whitespace-nowrap tracking-wide uppercase transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${btnSize(size)} ${btnVariant(variant)}`;

export function Btn({
  variant = "ghost",
  size = "md",
  loading,
  className = "",
  children,
  ...rest
}: BtnProps) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`${btnClass(variant, size)} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-3 w-3 animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Field({
  label,
  hint,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="label mb-1.5 block text-warm">{label}</span>
      <input
        {...rest}
        className="h-10 w-full border border-hair2 bg-ink px-3 text-sm text-[#e7e5e1] placeholder:text-[#4c5561] focus:border-amber"
      />
      {hint && <span className="mt-1 block text-[11px] text-warm">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  children,
  value,
  onChange,
}: {
  label: string;
  children: ReactNode;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="label mb-1.5 block text-warm">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none border border-hair2 bg-ink px-3 text-sm text-[#e7e5e1] focus:border-amber"
      >
        {children}
      </select>
    </label>
  );
}

export function Empty({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <svg viewBox="0 0 48 48" className="h-10 w-10 text-hair2" fill="none">
        <rect x="4.5" y="4.5" width="39" height="39" stroke="currentColor" />
        <path d="M10 33l8-9 6 5 7-12 7 8" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="38" cy="10" r="3" fill="currentColor" />
      </svg>
      <p className="font-display text-lg text-[#e7e5e1]">{title}</p>
      <p className="max-w-sm text-xs leading-relaxed text-warm">{hint}</p>
      {action}
    </div>
  );
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-9 border-b border-hair bg-[#14171b]"
          style={{ opacity: 1 - i * 0.12 }}
        />
      ))}
    </div>
  );
}

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "up" | "down" | "amber" | "muted";
  children: ReactNode;
}) {
  const tones = {
    neutral: "border-hair2 text-warm",
    muted: "border-hair text-[#5c6470]",
    up: "border-[#125c42] text-up",
    down: "border-[#5a1f28] text-down",
    amber: "border-amberdim text-amber",
  }[tone];
  return (
    <span className={`inline-flex h-5 items-center border px-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase ${tones}`}>
      {children}
    </span>
  );
}

export function Row({ children, cols }: { children: ReactNode; cols: string }) {
  return (
    <div
      className={`grid items-center gap-3 border-b border-hair px-3 py-2.5 text-xs transition-colors hover:bg-panel2 ${cols}`}
    >
      {children}
    </div>
  );
}
