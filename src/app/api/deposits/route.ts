import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deposits, wallets } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, handle, n } from "@/lib/api";
import { credit, debit } from "@/lib/wallet";
import { getMarket } from "@/lib/market";
import { initializeTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

const METHODS: Record<string, { currency: string; min: number }> = {
  mpesa: { currency: "KES", min: 100 },
  usdt: { currency: "USDT", min: 10 },
  btc: { currency: "BTC", min: 0.0001 },
  eth: { currency: "ETH", min: 0.001 },
  mastercard: { currency: "USD", min: 10 },
  visa: { currency: "USD", min: 10 },
};

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

    if (body.direction === "withdraw") {
      const amount = Number(body.amount);
      const method = String(body.method ?? "mpesa");
      if (!Number.isFinite(amount) || amount < 10) return fail("Minimum withdrawal is 10 USD");
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
    const spec = METHODS[method];
    if (!spec) return fail("Unsupported deposit method");
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < spec.min) {
      return fail(`Minimum deposit is ${spec.min} ${spec.currency}`);
    }
    const reference =
      method === "mpesa"
        ? `MP${Math.floor(Math.random() * 9e8 + 1e8)}`
        : method === "usdt" || method === "btc" || method === "eth"
          ? `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`
          : `AUTH${Math.floor(Math.random() * 9e5 + 1e5)}`;

    const [row] = await db
      .insert(deposits)
      .values({
        userId: user.id,
        method,
        amount: amount.toFixed(2),
        currency: spec.currency,
        reference,
        channelNote: String(body.channelNote ?? "").slice(0, 90) || null,
        status: "pending",
      })
      .returning();

    // For M-Pesa + cards, hand off to Paystack's hosted checkout. Paystack
    // charges in the deposit's currency (KES for M-Pesa, USD for cards), the
    // webhook settles the deposit once payment is confirmed. For crypto
    // (usdt/btc/eth) we still return the pending deposit — real on-chain
    // confirmation is a separate integration.
    if (method === "mpesa" || method === "mastercard" || method === "visa") {
      try {
        const channels = method === "mpesa" ? ["mobile_money"] : ["card"];
        const ps = await initializeTransaction(
          {
            email: user.email,
            amount,
            currency: spec.currency,
            reference: row.reference,
            channels,
            metadata: { deposit_id: row.id, user_id: user.id, method },
          },
          req,
        );
        return { deposit: row, authorization_url: ps.authorization_url };
      } catch (e) {
        // Paystack didn't initiate — leave the deposit pending so the user can
        // retry, and surface the error.
        const msg = e instanceof Error ? e.message : "Paystack initiate failed";
        return fail(`Could not start payment: ${msg}`, 502);
      }
    }

    return { deposit: row };
  });
}

/** Settling credits both the source-currency wallet and the USD trading wallet. */
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
  await credit(userId, dep.currency, "real", amount);

  let usd = amount;
  if (dep.currency === "KES") {
    const market = await getMarket();
    const rate = market.quotes["USD/KES"]?.price ?? 129.42;
    usd = amount / rate;
  } else if (dep.currency === "BTC") usd = amount * (68420.5);
  else if (dep.currency === "ETH") usd = amount * (3542.18);
  await credit(userId, "USD", "real", usd);

  const [updated] = await db
    .update(deposits)
    .set({ status: "completed", settledAt: new Date() })
    .where(eq(deposits.id, dep.id))
    .returning();
  return updated!;
}
