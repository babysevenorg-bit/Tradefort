import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deposits } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, handle, n } from "@/lib/api";
import { credit, debit } from "@/lib/wallet";
import { getMarket } from "@/lib/market";
import { initializeTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

// Crypto deposits (on-chain, not Paystack). The user enters the amount in the
// crypto's own units; settlement credits the crypto wallet + USD equivalent.
const CRYPTO_METHODS: Record<string, { currency: string; min: number }> = {
  usdt: { currency: "USDT", min: 10 },
  btc: { currency: "BTC", min: 0.0001 },
  eth: { currency: "ETH", min: 0.001 },
};

// Paystack methods. The user enters a USD trading credit (min $10). For M-Pesa
// we convert USD → KES at the live rate and Paystack pushes an STK prompt for
// the KES amount; cards charge USD directly.
const PAYSTACK_METHODS = ["mpesa", "mastercard", "visa"] as const;
const MIN_DEPOSIT_USD = 10;
const MIN_WITHDRAW_USD = 50;

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const rows = await db
      .select()
      .from(deposits)
      .where(eq(deposits.userId, user.id))
      .orderBy(desc(deposits.createdAt))
      .limit(60);
    return { deposits: rows };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = await req.json();

    // ── Withdrawal (real-account: debits USD, marks completed for review) ───
    if (body.direction === "withdraw") {
      const amount = Number(body.amount);
      const method = String(body.method ?? "mpesa");
      if (!Number.isFinite(amount) || amount < MIN_WITHDRAW_USD) {
        return fail(`Minimum withdrawal is ${MIN_WITHDRAW_USD} USD`);
      }
      const err = await debit(user.id, "USD", "real", amount);
      if (err) return fail(err, 402);
      const [row] = await db
        .insert(deposits)
        .values({
          userId: user.id,
          method: `withdraw:${method}`,
          amount: amount.toFixed(2),
          currency: "USD",
          reference: `WDR${Math.floor(Math.random() * 9e5 + 1e5)}`,
          channelNote: String(body.channelNote ?? "").slice(0, 90) || "Withdrawal requested",
          status: "completed",
          settledAt: new Date(),
        })
        .returning();
      return { deposit: row };
    }

    const method = String(body.method ?? "");

    // ── Paystack: M-Pesa + cards. User enters USD trading credit (min $10). ─
    if ((PAYSTACK_METHODS as readonly string[]).includes(method)) {
      const usd = Number(body.amount);
      if (!Number.isFinite(usd) || usd < MIN_DEPOSIT_USD) {
        return fail(`Minimum deposit is ${MIN_DEPOSIT_USD} USD`);
      }

      // For M-Pesa, convert the USD amount to KES at the live rate so Paystack
      // pushes an STK prompt for the KES figure the user actually pays. Cards
      // charge USD directly. The deposit RECORD stores the USD trading credit
      // (what the user receives on settlement) — the KES is the payment rail.
      let chargeAmount = usd;
      let chargeCurrency: "USD" | "KES" = "USD";
      let channelNote = String(body.channelNote ?? "").slice(0, 90) || null;
      if (method === "mpesa") {
        const market = await getMarket();
        const rate = market.quotes["USD/KES"]?.price ?? 129.42;
        chargeAmount = usd * rate;
        chargeCurrency = "KES";
        // Record the declared M-Pesa line + the KES the user will be STK-pushed.
        const line = String(body.channelNote ?? "").slice(0, 40);
        channelNote = `${line ? line + " · " : "M-Pesa STK · "}KES ${chargeAmount.toFixed(2)} ≈ $${usd.toFixed(2)}`;
      }

      const reference =
        method === "mpesa"
          ? `MP${Math.floor(Math.random() * 9e8 + 1e8)}`
          : `AUTH${Math.floor(Math.random() * 9e5 + 1e5)}`;

      const [row] = await db
        .insert(deposits)
        .values({
          userId: user.id,
          method,
          amount: usd.toFixed(2), // USD trading credit
          currency: "USD",
          reference,
          channelNote,
          status: "pending",
        })
        .returning();

      try {
        const channels = method === "mpesa" ? ["mobile_money"] : ["card"];
        const ps = await initializeTransaction(
          {
            email: user.email,
            amount: chargeAmount, // KES for M-Pesa, USD for cards
            currency: chargeCurrency,
            reference: row.reference,
            channels,
            metadata: {
              deposit_id: row.id,
              user_id: user.id,
              method,
              usd_amount: usd,
              charge_amount: chargeAmount,
              charge_currency: chargeCurrency,
            },
          },
          req,
        );
        return { deposit: row, authorization_url: ps.authorization_url };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Paystack initiate failed";
        return fail(`Could not start payment: ${msg}`, 502);
      }
    }

    // ── Crypto (usdt/btc/eth): on-chain, not Paystack. ─────────────────────
    const spec = CRYPTO_METHODS[method];
    if (!spec) return fail("Unsupported deposit method");
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < spec.min) {
      return fail(`Minimum deposit is ${spec.min} ${spec.currency}`);
    }
    const reference = `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`;
    const [row] = await db
      .insert(deposits)
      .values({
        userId: user.id,
        method,
        amount: amount.toFixed(8), // crypto precision
        currency: spec.currency,
        reference,
        channelNote: String(body.channelNote ?? "").slice(0, 90) || null,
        status: "pending",
      })
      .returning();
    return { deposit: row };
  });
}

/**
 * Settle a pending deposit: credit the USD trading wallet (+ the source-currency
 * wallet for legacy/crypto deposits) and mark completed. Idempotent — skips if
 * the deposit isn't pending.
 *
 * NOTE: this fixes a pre-existing double-credit. The old code credited the
 * source currency AND USD for every deposit — for a USD deposit that meant
 * crediting USD twice. Now: USD deposits (the new Paystack flow — M-Pesa/cards)
 * credit USD once; legacy/crypto deposits (KES/USDT/BTC/ETH) still credit the
 * source wallet + the USD equivalent.
 */
export async function settleDeposit(id: number, userId: number) {
  const rows = await db
    .select()
    .from(deposits)
    .where(eq(deposits.id, id))
    .limit(1);
  const dep = rows[0];
  if (!dep || dep.userId !== userId) return null;
  if (dep.status !== "pending") return dep;

  const amount = n(dep.amount);

  if (dep.currency === "USD") {
    // Paystack flow: M-Pesa converted to KES at charge time, cards charged USD
    // directly — the deposit record is the USD trading credit. Credit once.
    await credit(userId, "USD", "real", amount);
  } else {
    // Legacy / crypto: credit the source-currency wallet + convert to USD.
    await credit(userId, dep.currency, "real", amount);
    let usd = amount;
    if (dep.currency === "KES") {
      const market = await getMarket();
      const rate = market.quotes["USD/KES"]?.price ?? 129.42;
      usd = amount / rate;
    } else if (dep.currency === "BTC") usd = amount * 68420.5;
    else if (dep.currency === "ETH") usd = amount * 3542.18;
    else if (dep.currency === "USDT") usd = amount; // ~1:1 with USD
    await credit(userId, "USD", "real", usd);
  }

  const [updated] = await db
    .update(deposits)
    .set({ status: "completed", settledAt: new Date() })
    .where(eq(deposits.id, dep.id))
    .returning();
  return updated!;
}
