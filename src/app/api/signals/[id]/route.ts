import { eq } from "drizzle-orm";
import { db } from "@/db";
import { signals } from "@/db/schema";
import { fail, handle } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const body = await req.json();
    const patch: Partial<typeof signals.$inferInsert> = {};
    if (["active", "hit", "invalid", "retired"].includes(body.status)) patch.status = body.status;
    if (body.headline) patch.headline = String(body.headline).slice(0, 160);
    if (body.note !== undefined) patch.note = body.note ? String(body.note) : null;
    if (body.confidence !== undefined) patch.confidence = Math.max(1, Math.min(99, Number(body.confidence)));
    if (body.timeframe) patch.timeframe = String(body.timeframe);
    if (Object.keys(patch).length === 0) return fail("Nothing to update");

    const rows = await db.select().from(signals).where(eq(signals.id, Number(id))).limit(1);
    if (!rows[0]) return fail("Signal not found", 404);
    const [updated] = await db.update(signals).set(patch).where(eq(signals.id, rows[0].id)).returning();
    return { signal: updated };
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const rows = await db.select().from(signals).where(eq(signals.id, Number(id))).limit(1);
    if (!rows[0]) return fail("Signal not found", 404);
    await db.delete(signals).where(eq(signals.id, rows[0].id));
    return { ok: true, id: rows[0].id };
  });
}
