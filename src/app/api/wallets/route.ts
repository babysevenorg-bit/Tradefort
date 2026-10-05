import { eq } from "drizzle-orm";
import { db } from "@/db";
import { wallets } from "@/db/schema";
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

    // The "reset" action (which used to top up the demo paper balance to
    // $100,000) is gone — the app is real-only now. Surface a clear error so
    // stale clients get a useful message instead of a silent no-op.
    if (body.action === "reset") {
      return fail("Demo balance reset is no longer available — this account is real-only. Deposit to fund your balance.", 410);
    }

    // accountMode is locked to "real" for everyone; the old demo/real toggle
    // was removed from the UI. We no-op the PATCH but still ack so any stale
    // client call doesn't error.
    return { ok: true, accountMode: "real" };
  });
}
