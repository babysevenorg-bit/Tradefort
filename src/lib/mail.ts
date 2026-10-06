import nodemailer from "nodemailer";

// Gmail SMTP — used for: welcome email on register, login security alert,
// password-reset link. Credentials come from env (never committed).
//
//   SMTP_HOST     smtp.gmail.com
//   SMTP_PORT     465  (SSL)
//   SMTP_USER     your Gmail address (e.g. tradefort@gmail.com)
//   SMTP_PASS     a 16-char Gmail App Password (spaces optional)
//   APP_FROM      Display name <address>  (defaults to "Tradefort <SMTP_USER>")
//   APP_BASE_URL  https://your-tradefort.vercel.app  (for reset + app links)
//
// To get an App Password: Google Account → Security → 2-Step Verification →
// App Passwords (Google Mail → Other).

export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transporter() {
  if (!mailConfigured()) throw new Error("SMTP not configured (SMTP_USER/SMTP_PASS missing)");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 465,
    secure: (Number(process.env.SMTP_PORT) || 465) === 465,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });
}

function from(): string {
  const user = process.env.SMTP_USER!;
  return process.env.APP_FROM || `Tradefort <${user}>`;
}

function base(): string {
  return (process.env.APP_BASE_URL || "").replace(/\/$/, "");
}

/** Welcome email — sent on successful registration. */
export async function sendWelcome(opts: { to: string; name: string }) {
  if (!mailConfigured()) return;
  const link = base() || "https://example.com";
  await transporter().sendMail({
    from: from(),
    to: opts.to,
    subject: "Welcome to Tradefort — your trading account is ready",
    html: welcomeHtml(opts.name, link),
    text: `Hi ${opts.name},\n\nYour Tradefort trading account is ready. Deposit with M-Pesa, USDT, Mastercard or Visa to start trading the live feed.\n\nSign in: ${link}\n\n— The Tradefort desk`,
  });
}

/** Password-reset email — sent when a user requests a reset. */
export async function sendPasswordReset(opts: { to: string; name: string; token: string }) {
  if (!mailConfigured()) return;
  const link = `${base()}/reset-password?token=${opts.token}`;
  await transporter().sendMail({
    from: from(),
    to: opts.to,
    subject: "Reset your Tradefort password",
    html: resetHtml(opts.name, link),
    text: `Hi ${opts.name},\n\nWe received a request to reset your Tradefort password. This link expires in 1 hour:\n\n${link}\n\nIf you didn't request this, ignore this email — your password stays unchanged.\n\n— The Tradefort desk`,
  });
}

/** Login security alert — sent on each successful sign-in. */
export async function sendLoginAlert(opts: { to: string; name: string }) {
  if (!mailConfigured()) return;
  const when = new Date().toUTCString();
  await transporter().sendMail({
    from: from(),
    to: opts.to,
    subject: "New sign-in to your Tradefort account",
    html: loginHtml(opts.name, when),
    text: `Hi ${opts.name},\n\nA new sign-in to your Tradefort account just occurred (${when}). If this was you, no action is needed. If not, reset your password immediately.\n\n— The Tradefort desk`,
  });
}

/* ── HTML templates (on-brand amber/dark, minimal) ───────────────────── */

function wrap(name: string, bodyHtml: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#08090a;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#e7e5e1;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#08090a;padding:24px 12px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#101215;border:1px solid #1e222a;">
        <tr><td style="padding:20px 28px;border-bottom:1px solid #1e222a;background:#15181d;">
          <span style="font-size:15px;font-weight:700;color:#ffb020;letter-spacing:.02em;">MERIDIAN · Tradefort</span>
        </td></tr>
        <tr><td style="padding:28px;line-height:1.6;font-size:14px;color:#c9c4bc;">
          ${bodyHtml.replace("{name}", name)}
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #1e222a;color:#5c6470;font-size:11px;line-height:1.5;">
          You're receiving this email because a Tradefort account is associated with this address. Trade only what you can afford to lose.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function welcomeHtml(name: string, link: string): string {
  return wrap(name, `
    <p style="margin:0 0 12px">Hi {name},</p>
    <p style="margin:0 0 12px">Your <strong style="color:#e7e5e1">Tradefort</strong> trading account is ready. You start at a zero balance — fund it to trade the live feed.</p>
    <p style="margin:0 0 16px;color:#8c857a;">Deposit with M-Pesa (USD → KES STK push), Mastercard or Visa via Paystack. Live Binance pricing, forex, metals, indices and binary options.</p>
    <p style="margin:0"><a href="${link}" style="display:inline-block;background:#ffb020;color:#08090a;font-weight:700;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:12px 22px;border-radius:2px;text-decoration:none;">Open the terminal</a></p>`);
}

function resetHtml(name: string, link: string): string {
  return wrap(name, `
    <p style="margin:0 0 12px">Hi {name},</p>
    <p style="margin:0 0 16px">We received a request to reset your Tradefort password. Click below to choose a new one — this link expires in <strong style="color:#e7e5e1">1 hour</strong>.</p>
    <p style="margin:0 0 16px"><a href="${link}" style="display:inline-block;background:#ffb020;color:#08090a;font-weight:700;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:12px 22px;border-radius:2px;text-decoration:none;">Reset password</a></p>
    <p style="margin:0;color:#8c857a;font-size:12px;">If you didn't request this, ignore this email — your password stays unchanged.</p>
    <p style="margin:12px 0 0;color:#5c6470;font-size:11px;word-break:break-all;">Or paste: ${link}</p>`);
}

function loginHtml(name: string, when: string): string {
  return wrap(name, `
    <p style="margin:0 0 12px">Hi {name},</p>
    <p style="margin:0 0 12px">A new sign-in to your Tradefort account just occurred.</p>
    <p style="margin:0 0 16px"><strong style="color:#e7e5e1">When:</strong> ${when}</p>
    <p style="margin:0;color:#8c857a;font-size:12px;">If this was you, no action is needed. If not, reset your password immediately.</p>`);
}
