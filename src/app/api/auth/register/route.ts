import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, wallets } from "@/db/schema";
import { createSession, hashPassword } from "@/lib/auth";
import { fail, handle } from "@/lib/api";

export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!name || !email || !password) return fail("Name, email and password are required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address");
    if (password.length < 6) return fail("Password must be at least 6 characters");

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length) return fail("An account with that email already exists");

    const [user] = await db
      .insert(users)
      .values({
        name,
        email,
        country: String(body.country ?? "Kenya"),
        passwordHash: await hashPassword(password),
      })
      .returning();

    await db.insert(wallets).values([
      { userId: user.id, currency: "USD", kind: "demo", label: "Demo paper balance", balance: "100000.00" },
      { userId: user.id, currency: "USDT", kind: "real", label: "Tether · TRC20 + ERC20", address: "TQ7mN4xVb2kR9sYgHdW3pLuZcE5aXn1JvF", balance: "0.00" },
      { userId: user.id, currency: "KES", kind: "real", label: "M-Pesa Safaricom", address: "2547•••••21", balance: "0.00" },
      { userId: user.id, currency: "USD", kind: "real", label: "Card · Mastercard / Visa", balance: "0.00" },
    ]);

    await createSession(user.id);
    const { passwordHash: _drop, ...safe } = user;
    void _drop;
    return { user: safe };
  });
}
