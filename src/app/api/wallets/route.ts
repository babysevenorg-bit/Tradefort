import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { wallets, users, trades } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, handle } from "@/lib/api";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const rows = await db.select().from(wallets).where(eq(wallets.userId, user.id));
    return { wallets: rows };
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = await req.json();

    if (body.action === "reset") {
      await db
        .delete(trades)
        .where(and(eq(trades.userId, user.id), eq(trades.mode, "demo"), eq(trades.status, "open")));
      const [w] = await db
        .update(wallets)
        .set({ balance: "100000.00", updatedAt: new Date() })
        .where(and(eq(wallets.userId, user.id), eq(wallets.currency, "USD"), eq(wallets.kind, "demo")))
        .returning();
      if (!w) {
        const [fresh] = await db
          .insert(wallets)
          .values({
            userId: user.id,
            currency: "USD",
            kind: "demo",
            label: "Demo paper balance",
            balance: "100000.00",
          })
          .returning();
        return { wallet: fresh };
      }
      return { wallet: w };
    }

    const [updated] = await db
      .update(users)
      .set({ accountMode: body.mode === "real" ? "real" : "demo" })
      .where(eq(users.id, user.id))
      .returning();
    void updated;
    return { ok: true };
  });
}
