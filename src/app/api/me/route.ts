import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, wallets, watchlist, trades, signals } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { fail, handle, n } from "@/lib/api";

export async function GET() {
  return handle(async () => {
    const user = await currentUser();
    if (!user) return fail("Not signed in", 401);
    const [ws, stars, openTrades, activeSignals] = await Promise.all([
      db.select().from(wallets).where(eq(wallets.userId, user.id)),
      db.select().from(watchlist).where(eq(watchlist.userId, user.id)),
      db.select().from(trades).where(eq(trades.userId, user.id)),
      db.select().from(signals),
    ]);
    const { passwordHash: _drop, ...safe } = user;
    void _drop;
    return {
      user: safe,
      wallets: ws,
      watchlist: stars.map((s) => s.symbol),
      stats: {
        open: openTrades.filter((t) => t.status === "open").length,
        closed: openTrades.filter((t) => t.status !== "open").length,
        pnl: openTrades.reduce((sum, t) => sum + n(t.pnl), 0),
        signals: activeSignals.filter((s) => s.status === "active").length,
      },
    };
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const user = await currentUser();
    if (!user) return fail("Not signed in", 401);
    const body = await req.json();
    const patch: Partial<typeof users.$inferInsert> = {};
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body.country === "string" && body.country.trim()) patch.country = body.country.trim();
    if (body.accountMode === "demo" || body.accountMode === "real") patch.accountMode = body.accountMode;
    const [updated] = await db.update(users).set(patch).where(eq(users.id, user.id)).returning();
    const { passwordHash: _drop, ...safe } = updated;
    void _drop;
    return { user: safe };
  });
}
