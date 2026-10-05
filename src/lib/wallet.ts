import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { wallets } from "@/db/schema";

export async function getWallet(userId: number, currency: string, kind: string) {
  const rows = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.userId, userId), eq(wallets.currency, currency), eq(wallets.kind, kind)))
    .limit(1);
  if (rows[0]) return rows[0];
  const [created] = await db
    .insert(wallets)
    .values({
      userId,
      currency,
      kind,
      label: `${currency} · ${kind === "demo" ? "Paper" : "Live"}`,
      balance: "0.00",
    })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const again = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.userId, userId), eq(wallets.currency, currency), eq(wallets.kind, kind)))
    .limit(1);
  return again[0]!;
}

export async function credit(userId: number, currency: string, kind: string, amount: number) {
  const w = await getWallet(userId, currency, kind);
  const [updated] = await db
    .update(wallets)
    .set({ balance: (Number(w.balance) + amount).toFixed(2), updatedAt: new Date() })
    .where(eq(wallets.id, w.id))
    .returning();
  return updated!;
}

/** Returns null on success, or an error message when funds are short. */
export async function debit(
  userId: number,
  currency: string,
  kind: string,
  amount: number,
): Promise<string | null> {
  const w = await getWallet(userId, currency, kind);
  const balance = Number(w.balance);
  if (balance + 1e-9 < amount) return `Insufficient ${currency} balance`;
  await db
    .update(wallets)
    .set({ balance: (balance - amount).toFixed(2), updatedAt: new Date() })
    .where(eq(wallets.id, w.id));
  return null;
}
