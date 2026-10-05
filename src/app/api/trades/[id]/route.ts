import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { trades } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, handle, n } from "@/lib/api";
import { getMarket } from "@/lib/market";
import { credit } from "@/lib/wallet";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const rows = await db
      .select()
      .from(trades)
      .where(and(eq(trades.id, Number(id)), eq(trades.userId, user.id)))
      .limit(1);
    const trade = rows[0];
    if (!trade) return fail("Position not found", 404);
    if (trade.status !== "open") return fail("Position is already settled");

    if (body.action === "cancel") {
      await credit(user.id, "USD", trade.mode, n(trade.amount));
      const [removed] = await db.delete(trades).where(eq(trades.id, trade.id)).returning();
      return { trade: removed };
    }

    const market = await getMarket();
    const quote = market.quotes[trade.symbol];
    if (!quote) return fail("No price feed", 503);
    const price = quote.price;
    const entry = n(trade.entryPrice);
    const side = trade.side === "buy" || trade.side === "up" ? 1 : -1;
    const gross =
      trade.product === "binary"
        ? 0
        : ((price - entry) / entry) * side * n(trade.amount) * n(trade.leverage || 1);
    const refund = trade.product === "binary" ? 0 : n(trade.amount);
    await credit(user.id, "USD", trade.mode, refund + gross);

    const [updated] = await db
      .update(trades)
      .set({
        status: trade.product === "binary" ? (gross >= 0 ? "won" : "closed") : "closed",
        pnl: gross.toFixed(2),
        exitPrice: price.toFixed(6),
        closedAt: new Date(),
      })
      .where(eq(trades.id, trade.id))
      .returning();
    return { trade: updated };
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const rows = await db
      .select()
      .from(trades)
      .where(and(eq(trades.id, Number(id)), eq(trades.userId, user.id)))
      .limit(1);
    const trade = rows[0];
    if (!trade) return fail("Position not found", 404);
    if (trade.status === "open") await credit(user.id, "USD", trade.mode, n(trade.amount));
    await db.delete(trades).where(eq(trades.id, trade.id));
    return { ok: true, id: trade.id };
  });
}
