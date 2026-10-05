import crypto from "node:crypto";

// Paystack client — server-side only. Uses the secret key to initialize
// transactions, verify them, and verify webhook signatures.
//
// Env vars (set on Vercel):
//   PAYSTACK_SECRET_KEY  sk_live_...   (required for initiate/verify/webhook)
//   PAYSTACK_PUBLIC_KEY  pk_live_...   (optional — only if you ever need it
//                                      client-side; the hosted checkout page
//                                      doesn't need the public key)
//   APP_BASE_URL         https://tradefort.vercel.app  (used to build the
//                                      callback URL; falls back to the
//                                      request's host header)

const BASE = "https://api.paystack.co";

export function paystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

function secret(): string {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return k;
}

export type InitTxn = {
  email: string;
  amount: number; // major-unit amount in the deposit currency (e.g. 1000 KES, 10 USD)
  currency: "KES" | "USD" | "NGN" | "GHS" | "ZAR" | string;
  reference: string;
  channels?: string[]; // ["mobile_money"] for M-Pesa, ["card"] for cards
  metadata?: Record<string, unknown>;
};

export type InitResult = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

/** Create a Paystack transaction and get the hosted-checkout authorization URL. */
export async function initializeTransaction(
  opts: InitTxn,
  req?: Request,
): Promise<InitResult> {
  // Paystack wants the amount in the smallest currency unit (kobo/cents).
  const smallest = Math.round(opts.amount * 100);
  const callback_url = buildCallbackUrl(req);

  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: opts.email,
      amount: smallest,
      currency: opts.currency,
      reference: opts.reference,
      callback_url,
      channels: opts.channels,
      metadata: { ...opts.metadata, source: "tradefort", deposit_currency: opts.currency },
    }),
  });
  const data = await res.json();
  if (!data?.status || !data?.data?.authorization_url) {
    throw new Error(data?.message || `Paystack initialize failed (HTTP ${res.status})`);
  }
  return data.data as InitResult;
}

export type VerifyResult = {
  status: string; // "success" | "failed" | "abandoned" | "pending" ...
  reference: string;
  amount: number; // smallest currency unit
  currency: string;
  channel: string;
  gateway_response: string;
  customer: { email: string };
  metadata?: Record<string, unknown>;
};

/** Verify a transaction by reference (server-side, authoritative). */
export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  const res = await fetch(
    `${BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret()}` } },
  );
  const data = await res.json();
  if (!data?.status || !data?.data) {
    throw new Error(data?.message || `Paystack verify failed (HTTP ${res.status})`);
  }
  return data.data as VerifyResult;
}

/**
 * Verify a Paystack webhook signature. Paystack sends the raw request body
 * signed with HMAC-SHA512 using the secret key in the `x-paystack-signature`
 * header. This is the authoritative confirmation — the browser redirect can be
 * spoofed, the webhook signature cannot.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!signature) return false;
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) return false;
  const expected = crypto.createHmac("sha512", k).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Build the post-payment browser-redirect URL (Paystack redirects here). */
function buildCallbackUrl(req?: Request): string {
  const envBase = process.env.APP_BASE_URL;
  if (envBase) return `${envBase.replace(/\/$/, "")}/api/paystack/callback`;
  if (req) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}/api/paystack/callback`;
  }
  // Last-resort fallback (dev only); Paystack won't redirect to localhost.
  return "http://localhost:3000/api/paystack/callback";
}
