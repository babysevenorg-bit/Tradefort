import { db } from "@/db";
import { deposits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { verifyTransaction } from "@/lib/paystack";
import { settleDeposit } from "@/app/api/deposits/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Paystack browser-redirect callback.
 *
 * After the user pays on Paystack's hosted checkout, Paystack redirects their
 * browser to the `callback_url` we passed at initialization (this route), with
 * `?trxref=...&reference=...` in the query. The redirect can be spoofed, so we
 * DON'T trust it — we call Paystack's server-side `verify` endpoint and only
 * settle if Paystack confirms the transaction as `success`.
 *
 * The webhook (/api/paystack/webhook) is the authoritative path; this callback
 * just gives the user immediate feedback + refreshes their balance.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = url.searchParams.get("reference") ?? url.searchParams.get("trxref");

  if (!reference) {
    return NextResponse.redirect(new URL("/dashboard/wallet?payment=missing", url.origin));
  }

  // Find the deposit by reference (so we know whose + which to settle).
  const rows = await db
    .select()
    .from(deposits)
    .where(eq(deposits.reference, reference))
    .limit(1);
  const dep = rows[0];

  if (!dep) {
    return NextResponse.redirect(new URL("/dashboard/wallet?payment=unknown", url.origin));
  }

  // Already settled (e.g. webhook arrived first) — just bounce to the wallet.
  if (dep.status === "completed") {
    return NextResponse.redirect(new URL("/dashboard/wallet?payment=success", url.origin));
  }

  // Verify with Paystack (authoritative) before crediting.
  try {
    const v = await verifyTransaction(reference);
    if (v.status === "success") {
      await settleDeposit(dep.id, dep.userId);
      return NextResponse.redirect(new URL("/dashboard/wallet?payment=success", url.origin));
    }
    return NextResponse.redirect(
      new URL(`/dashboard/wallet?payment=${encodeURIComponent(v.status || "failed")}`, url.origin),
    );
  } catch (e) {
    console.warn("[paystack] callback verify error:", reference, e);
    // Don't credit on error — the webhook will reconcile if Paystack later confirms.
    return NextResponse.redirect(new URL("/dashboard/wallet?payment=verify_failed", url.origin));
  }
}
