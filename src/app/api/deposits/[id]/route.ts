import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { deposits } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, handle } from "@/lib/api";
import { settleDeposit } from "../route";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const rows = await db
      .select()
      .from(deposits)
      .where(and(eq(deposits.id, Number(id)), eq(deposits.userId, user.id)))
      .limit(1);
    const dep = rows[0];
    if (!dep) return fail("Deposit not found", 404);

    if (body.action === "settle") {
      const updated = await settleDeposit(dep.id, user.id);
      return { deposit: updated };
    }
    if (body.action === "cancel") {
      if (dep.status !== "pending") return fail("Only pending deposits can be cancelled");
      const [removed] = await db.delete(deposits).where(eq(deposits.id, dep.id)).returning();
      return { deposit: removed };
    }
    return fail("Unknown action");
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const rows = await db
      .select()
      .from(deposits)
      .where(and(eq(deposits.id, Number(id)), eq(deposits.userId, user.id)))
      .limit(1);
    if (!rows[0]) return fail("Deposit not found", 404);
    if (rows[0].status === "pending") return fail("Cancel the pending deposit first");
    await db.delete(deposits).where(eq(deposits.id, rows[0].id));
    return { ok: true, id: rows[0].id };
  });
}
