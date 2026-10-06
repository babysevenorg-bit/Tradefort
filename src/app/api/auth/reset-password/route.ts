import crypto from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users, passwordResets } from "@/db/schema";
import { fail, handle } from "@/lib/api";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Reset a password with a token from the reset email. The token (raw hex from
 * the email link) is sha256-hashed and matched against the stored hash; the
 * reset must be unused + not expired. On success the user's passwordHash is
 * updated and the token is marked used (single-use).
 */
export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token ?? "");
    const password = String(body.password ?? "");
    if (!token) return fail("Reset token is missing");
    if (password.length < 6) return fail("Password must be at least 6 characters");

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const now = new Date();

    const rows = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, tokenHash),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, now),
        ),
      )
      .limit(1);
    const reset = rows[0];
    if (!reset) return fail("This reset link is invalid or has expired", 410);

    // Mark the token used FIRST (single-use), then update the password. If the
    // password update fails the token is already consumed — the user requests
    // a fresh reset. (Avoiding db.transaction since Neon's pooled PgBouncer
    // endpoint can trip on prepared statements inside transactions.)
    const passwordHash = await hashPassword(password);
    await db
      .update(passwordResets)
      .set({ usedAt: now })
      .where(eq(passwordResets.id, reset.id));
    await db.update(users).set({ passwordHash }).where(eq(users.id, reset.userId));

    return { ok: true, message: "Your password has been reset. You can sign in now." };
  });
}
