import { db } from "@/db";
import { instruments } from "@/db/schema";
import { count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Driver-agnostic connectivity probe (works under both drizzle/bun-sqlite
    // and drizzle/better-sqlite3). Original used pg's db.execute(sql`select 1`)
    // which doesn't exist on the sqlite drivers.
    const [{ c }] = db
      .select({ c: count() })
      .from(instruments)
      .limit(1)
      .all();
    return Response.json({ ok: true, instruments: c });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
