import { db } from "@/db";
import { deposits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyWebhookSignature } from "@/lib/paystack";
import { settleDeposit } from "@/app/api/deposits/route";

export const dynamic = "force-dynamic";
// Webhook must run on Node (crypto HMAC + raw body), not Edge.
export const runtime = "nodejs";

/**
 * Paystack webhook — the AUTHORITATIVE payment confirmation.
 *
 * Paystack POSTs the raw event body here, signed with HMAC-SHA512 in the
 * `x-paystack-signature` header. We verify the signature (the browser-redirect
 * callback can be spoofed; this signature cannot), then on `charge.success` we
 * locate the pending deposit by reference and settle it (credit the
 * source-currency wallet + convert to USD trading balance via settleDeposit).
 *
 * Configure this URL in the Paystack dashboard:
 *   Settings → API Configuration → Webhook URL
 *   →  https://<your-vercel-domain>/api/paystack/webhook
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  if (!verifyWebhookSignature(raw, signature)) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  // Paystack event types we care about. `charge.success` is the only one that
  // credits a deposit; everything else is acknowledged but ignored.
  if (event?.event !== "charge.success") {
    return Response.json({ status: "ignored", event: event?.event });
  }

  const data = event?.data;
  const reference: string | undefined = data?.reference;
  if (!reference) return Response.json({ error: "no reference" }, { status: 400 });

  // Find the pending deposit by reference.
  const rows = await db
    .select()
    .from(deposits)
    .where(eq(deposits.reference, reference))
    .limit(1);
  const dep = rows[0];
  if (!dep) {
    // Unknown reference — ack so Paystack doesn't retry forever, but log it.
    console.warn("[paystack] webhook for unknown reference:", reference);
    return Response.json({ status: "unknown_reference" });
  }
  if (dep.status !== "pending") {
    // Already settled (e.g. via the browser-callback path) — idempotent ack.
    return Response.json({ status: "already_settled", reference });
  }

  // Defence against a tampered/underpaid transaction: confirm the amount +
  // currency Paystack reports matches what we recorded. Paystack's amount is in
  // the smallest currency unit; our stored amount is major-unit.
  const expectedSmallest = Math.round(Number(dep.amount) * 100);
  if (typeof data?.amount === "number" && data.amount !== expectedSmallest) {
    console.warn(
      `[paystack] amount mismatch for ${reference}: expected ${expectedSmallest}, got ${data.amount}`,
    );
    return Response.json({ error: "amount mismatch" }, { status: 400 });
  }
  if (data?.currency && dep.currency && data.currency !== dep.currency) {
    console.warn(
      `[paystack] currency mismatch for ${reference}: expected ${dep.currency}, got ${data.currency}`,
    );
    return Response.json({ error: "currency mismatch" }, { status: 400 });
  }

  // Settle: credits the source-currency wallet + USD trading wallet, marks the
  // deposit completed.
  await settleDeposit(dep.id, dep.userId);

  return Response.json({ status: "settled", reference });
}
