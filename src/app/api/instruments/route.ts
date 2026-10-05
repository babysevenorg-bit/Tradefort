import { desc } from "drizzle-orm";
import { db } from "@/db";
import { instruments } from "@/db/schema";
import { handle } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const rows = await db.select().from(instruments).orderBy(desc(instruments.klass), instruments.symbol);
    return { instruments: rows };
  });
}
