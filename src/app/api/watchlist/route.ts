import { eq } from "drizzle-orm";
import { db } from "@/db";
import { watchlist, instruments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, handle } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const rows = await db.select().from(watchlist).where(eq(watchlist.userId, user.id));
    return { watchlist: rows };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = await req.json();
    const symbol = String(body.symbol ?? "");
    const inst = (await db.select().from(instruments).where(eq(instruments.symbol, symbol)).limit(1))[0];
    if (!inst) return fail("Unknown instrument");
    const [row] = await db
      .insert(watchlist)
      .values({ userId: user.id, symbol, note: body.note ? String(body.note).slice(0, 90) : null })
      .onConflictDoNothing()
      .returning();
    return { watch: row ?? null, symbol };
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const symbol = String(body.symbol ?? "");
    const rows = await db
      .delete(watchlist)
      .where(eq(watchlist.userId, user.id))
      .returning()
      .then((r) => r.filter((row) => row.symbol === symbol));
    if (!rows.length) return fail("Not in watchlist", 404);
    return { ok: true, symbol };
  });
}
