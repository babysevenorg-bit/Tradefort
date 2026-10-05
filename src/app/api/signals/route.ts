import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { signals, instruments } from "@/db/schema";
import { handle, fail, n } from "@/lib/api";
import { getMarket } from "@/lib/market";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const rows = await db.select().from(signals).orderBy(desc(signals.createdAt)).limit(60);
    const market = await getMarket();
    const enriched = rows.map((s) => ({
      ...s,
      price: market.quotes[s.symbol]?.price ?? n(s.entry),
      changePct: market.quotes[s.symbol]?.changePct ?? 0,
    }));
    return { signals: enriched, source: market.source };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json();
    const symbol = String(body.symbol ?? "");
    const inst = (await db.select().from(instruments).where(eq(instruments.symbol, symbol)).limit(1))[0];
    if (!inst) return fail("Unknown instrument");
    const direction = body.direction === "short" ? "short" : "long";
    const entry = Number(body.entry);
    const stop = Number(body.stop);
    const target = Number(body.target);
    const confidence = Math.max(1, Math.min(99, Math.round(Number(body.confidence) || 70)));
    if (![entry, stop, target].every(Number.isFinite)) return fail("entry, stop and target are required");
    if (!String(body.headline ?? "").trim()) return fail("Headline is required");

    const [row] = await db
      .insert(signals)
      .values({
        symbol,
        klass: inst.klass,
        direction,
        timeframe: String(body.timeframe ?? "H1"),
        entry: entry.toFixed(6),
        stop: stop.toFixed(6),
        target: target.toFixed(6),
        confidence,
        source: String(body.source ?? "Meridian Quant").slice(0, 40),
        headline: String(body.headline).slice(0, 160),
        note: body.note ? String(body.note).slice(0, 1000) : null,
        status: "active",
      })
      .returning();
    return { signal: row };
  });
}
