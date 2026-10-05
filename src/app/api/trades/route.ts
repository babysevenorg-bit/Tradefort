import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { trades, instruments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, handle, n } from "@/lib/api";
import { getMarket } from "@/lib/market";
import { credit, debit } from "@/lib/wallet";

export const dynamic = "force-dynamic";

/** Lazy settlement: binary expiries and stop/target hits resolve whenever positions are fetched. */
export async function settleUserTrades(userId: number) {
  const open = await db.select().from(trades).where(eq(trades.userId, userId));
  const pending = open.filter((t) => t.status === "open");
  if (!pending.length) return;
  const market = await getMarket();
  const now = new Date();

  for (const t of pending) {
    const quote = market.quotes[t.symbol];
    if (!quote) continue;
    const price = quote.price;
    const entry = n(t.entryPrice);
    const stop = t.stopLoss ? n(t.stopLoss) : null;
    const tp = t.takeProfit ? n(t.takeProfit) : null;
    const expired = t.expiry ? t.expiry.getTime() <= now.getTime() : false;

    if (t.product === "binary" && expired) {
      const win = t.side === "up" ? price > entry : price < entry;
      const stake = n(t.amount);
      const payout = stake * (t.payoutBp ?? 8700) / 10000;
      if (win) await credit(userId, "USD", t.mode, stake + payout);
      await db
        .update(trades)
        .set({
          status: win ? "won" : "lost",
          pnl: (win ? payout : -stake).toFixed(2),
          exitPrice: price.toFixed(6),
          closedAt: now,
        })
        .where(eq(trades.id, t.id));
      continue;
    }

    if (t.product !== "binary" && (stop || tp)) {
      const side = t.side === "buy" ? 1 : -1;
      const hitTp = tp !== null && (side === 1 ? price >= tp : price <= tp);
      const hitSl = stop !== null && (side === 1 ? price <= stop : price >= stop);
      if (hitTp || hitSl) {
        const gross = ((price - entry) / entry) * side * n(t.amount) * n(t.leverage || 1);
        await credit(userId, "USD", t.mode, n(t.amount) + gross);
        await db
          .update(trades)
          .set({
            status: "closed",
            pnl: gross.toFixed(2),
            exitPrice: price.toFixed(6),
            closedAt: now,
            stopLoss: null,
            takeProfit: null,
          })
          .where(eq(trades.id, t.id));
      }
    }
  }
}

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    await settleUserTrades(user.id);
    const rows = await db
      .select()
      .from(trades)
      .where(eq(trades.userId, user.id))
      .orderBy(desc(trades.openedAt))
      .limit(100);
    return { trades: rows };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = await req.json();
    const symbol = String(body.symbol ?? "");
    const product = String(body.product ?? "spot");
    const side = String(body.side ?? "buy");
    const mode = body.mode === "real" ? "real" : "demo";
    const amount = Number(body.amount);
    const leverage = Math.max(1, Math.min(125, Number(body.leverage ?? 1)));
    const expirySeconds = [30, 60, 300, 900].includes(Number(body.expirySeconds))
      ? Number(body.expirySeconds)
      : 60;

    if (!symbol) return fail("Pick an instrument");
    if (!["buy", "sell", "up", "down"].includes(side)) return fail("Invalid side");
    if (!Number.isFinite(amount) || amount < 1) return fail("Amount must be at least 1");

    const instRows = await db.select().from(instruments).where(eq(instruments.symbol, symbol)).limit(1);
    const inst = instRows[0];
    if (!inst) return fail("Unknown instrument");

    const market = await getMarket();
    const quote = market.quotes[symbol];
    if (!quote) return fail("No price feed for that instrument", 503);

    const err = await debit(user.id, "USD", mode, amount);
    if (err) return fail(err, 402);

    const price = quote.price;
    const quantity = product === "binary" ? 0 : (amount * leverage) / price;
    const [row] = await db
      .insert(trades)
      .values({
        userId: user.id,
        symbol,
        klass: inst.klass,
        mode,
        product: product === "binary" ? "binary" : product === "forex" ? "forex" : "spot",
        side,
        amount: amount.toFixed(2),
        quantity: quantity.toFixed(8),
        leverage,
        entryPrice: price.toFixed(6),
        payoutBp: product === "binary" ? inst.payoutBp : null,
        expiry: product === "binary" ? new Date(Date.now() + expirySeconds * 1000) : null,
        stopLoss: body.stopLoss ? Number(body.stopLoss).toFixed(6) : null,
        takeProfit: body.takeProfit ? Number(body.takeProfit).toFixed(6) : null,
        status: "open",
      })
      .returning();

    return { trade: row, source: market.source };
  });
}
