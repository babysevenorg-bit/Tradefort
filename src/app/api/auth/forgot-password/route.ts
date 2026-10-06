import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, passwordResets } from "@/db/schema";
import { fail, handle } from "@/lib/api";
import { sendPasswordReset } from "@/lib/mail";

export const dynamic = "force-dynamic";

/**
 * Request a password-reset link. Always returns the same generic message
 * whether or not the email exists (no email-enumeration leak). If the account
 * exists, a token (32 random bytes, hex) is generated, stored hashed (sha256)
 * with a 1-hour expiry, and emailed to the user.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail("Enter a valid email address");
    }

    // Look up the user. We always ack success so an attacker can't probe
    // which emails are registered.
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await db.insert(passwordResets).values({ userId: user.id, tokenHash, expiresAt });
      // Fire-and-forget the email — don't block the response on SMTP, and don't
      // surface SMTP errors to the client (they'd leak whether the email sent).
      void sendPasswordReset({ to: user.email, name: user.name, token }).catch((e) =>
        console.error("[mail] password reset send failed:", e),
      );
    }

    return {
      ok: true,
      message: "If an account exists for that email, a reset link is on its way.",
    };
  });
}
