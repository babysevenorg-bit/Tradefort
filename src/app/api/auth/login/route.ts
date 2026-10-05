import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";
import { fail, handle } from "@/lib/api";

export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) return fail("Email and password are required");

    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return fail("Incorrect email or password", 401);
    }
    await createSession(user.id);
    const { passwordHash: _drop, ...safe } = user;
    void _drop;
    return { user: safe };
  });
}
