import nodemailer from "nodemailer";

// Gmail SMTP — used for: welcome email on register, login security alert,
// password-reset link. Credentials come from env (never committed).
//
//   SMTP_HOST     smtp.gmail.com
//   SMTP_PORT     465  (SSL)
//   SMTP_USER     your Gmail address (e.g. deykwa99@gmail.com)
//   SMTP_PASS     a 16-char Gmail App Password (spaces optional)
//   APP_FROM      Display name <address>  (defaults to "Tradefort <SMTP_USER>")
//   APP_BASE_URL  https://your-tradefort.vercel.app  (for reset + app links)

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

/* ── Senders ──────────────────────────────────────────────────────────── */

export async function sendWelcome(opts: { to: string; name: string }) {
  if (!mailConfigured()) return;
  const link = base() || "https://example.com";
  await transporter().sendMail({
    from: from(),
    to: opts.to,
    subject: "Welcome to Tradefort — your trading account is ready",
    html: wrap({
      eyebrow: "DESK NOTE · ACCOUNT OPENED",
      hero: "Your trading account is ready.",
      bodyHtml: `
        <p style="margin:0 0 14px;color:#c9c4bc;">Hi <strong style="color:#fbe8da;">${esc(opts.name)}</strong>,</p>
        <p style="margin:0 0 14px;color:#c9c4bc;">Your <strong style="color:#fbe8da;">Tradefort</strong> account is live. You start at a zero balance — fund it to trade the live feed.</p>
        ${grid([
          ["CRYPTO", "BTC · ETH · SOL · XRP · BNB"],
          ["FOREX", "EUR/USD · GBP/USD · USD/KES · JPY"],
          ["METALS · INDICES", "XAU · US30 · NAS100"],
        ])}
        <p style="margin:16px 0 0;color:#8c857a;font-size:13px;">Deposit with <strong style="color:#fbe8da;">M-Pesa</strong> (USD → KES STK push), <strong style="color:#fbe8da;">Mastercard</strong> or <strong style="color:#fbe8da;">Visa</strong> via Paystack. Live Binance pricing. Binary options up to 90% payout.</p>`,
      cta: { label: "Open the terminal", href: link },
    }),
    text: `Hi ${opts.name},\n\nYour Tradefort trading account is ready. You start at a zero balance — fund it with M-Pesa, Mastercard or Visa to trade the live feed (Binance crypto, forex, metals, indices, binary options).\n\nOpen the terminal: ${link}\n\n— The Tradefort desk`,
  });
}

export async function sendPasswordReset(opts: { to: string; name: string; token: string }) {
  if (!mailConfigured()) return;
  const link = `${base()}/reset-password?token=${opts.token}`;
  await transporter().sendMail({
    from: from(),
    to: opts.to,
    subject: "Reset your Tradefort password",
    html: wrap({
      eyebrow: "DESK NOTE · PASSWORD RESET REQUESTED",
      hero: "Choose a new password.",
      bodyHtml: `
        <p style="margin:0 0 14px;color:#c9c4bc;">Hi <strong style="color:#fbe8da;">${esc(opts.name)}</strong>,</p>
        <p style="margin:0 0 14px;color:#c9c4bc;">We received a request to reset your Tradefort password. Click below to choose a new one.</p>
        ${metaBox([
          ["LINK EXPIRES", "in 1 hour"],
          ["SINGLE USE", "one reset per link"],
        ])}
        <p style="margin:16px 0 0;color:#8c857a;font-size:13px;">If you didn't request this, ignore this email — your password stays unchanged. No one asked for this reset? Your account is safe.</p>`,
      cta: { label: "Reset password", href: link },
      ctaFallback: link,
    }),
    text: `Hi ${opts.name},\n\nWe received a request to reset your Tradefort password. This link is single-use and expires in 1 hour:\n\n${link}\n\nIf you didn't request this, ignore this email — your password stays unchanged.\n\n— The Tradefort desk`,
  });
}

export async function sendLoginAlert(opts: { to: string; name: string }) {
  if (!mailConfigured()) return;
  const when = new Date().toUTCString();
  const resetLink = `${base()}/forgot-password`;
  await transporter().sendMail({
    from: from(),
    to: opts.to,
    subject: "New sign-in to your Tradefort account",
    html: wrap({
      eyebrow: "DESK NOTE · SECURITY ALERT",
      hero: "A new sign-in just happened.",
      bodyHtml: `
        <p style="margin:0 0 14px;color:#c9c4bc;">Hi <strong style="color:#fbe8da;">${esc(opts.name)}</strong>,</p>
        <p style="margin:0 0 16px;color:#c9c4bc;">Someone signed in to your Tradefort account. If that was you, no action is needed.</p>
        ${metaBox([
          ["WHEN", when],
          ["ACCOUNT", opts.to],
        ])}
        <p style="margin:16px 0 0;color:#8c857a;font-size:13px;">Wasn't you? Reset your password right away.</p>`,
      cta: { label: "Reset password", href: resetLink },
    }),
    text: `Hi ${opts.name},\n\nA new sign-in to your Tradefort account just occurred (${when}). If this was you, no action is needed. If not, reset your password immediately: ${resetLink}\n\n— The Tradefort desk`,
  });
}

/* ── Template renderer (table-based, email-safe, on-brand) ────────────── */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function ctaButton(label: string, href: string): string {
  // Bulletproof button: a table-cell with background-color + a link inside.
  return `
  <table cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
    <tr>
      <td style="background:#ffb020;border-radius:2px;">
        <a href="${esc(href)}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:13px;font-weight:700;color:#08090a;text-decoration:none;text-transform:uppercase;letter-spacing:.08em;">${esc(label)}</a>
      </td>
    </tr>
  </table>`;
}

function grid(cells: [string, string][]): string {
  const cols = cells
    .map(
      ([k, v]) => `
      <td style="width:33.33%;padding:14px 12px;background:#0c0d0f;border:1px solid #1e222a;vertical-align:top;">
        <div style="font-size:9px;font-weight:700;color:#ffb020;letter-spacing:.16em;text-transform:uppercase;">${esc(k)}</div>
        <div style="margin-top:6px;font-size:11px;color:#c9c4bc;line-height:1.5;">${esc(v)}</div>
      </td>`,
    )
    .join('<td style="width:4px;"></td>');
  return `
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0;">
    <tr>${cols}</tr>
  </table>`;
}

function metaBox(rows: [string, string][]): string {
  const lines = rows
    .map(
      ([k, v]) => `
      <tr>
        <td style="font-size:9px;font-weight:700;color:#8c857a;letter-spacing:.16em;text-transform:uppercase;padding:6px 0;width:140px;">${esc(k)}</td>
        <td style="font-size:12px;color:#fbe8da;font-family:ui-monospace,'SF Mono',Menlo,monospace;padding:6px 0;">${esc(v)}</td>
      </tr>`,
    )
    .join("");
  return `
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0;border:1px solid #1e222a;background:#0c0d0f;">
    <tr><td style="padding:8px 14px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">${lines}</table>
    </td></tr>
  </table>`;
}

function wrap(opts: {
  eyebrow: string;
  hero: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
  ctaFallback?: string;
}): string {
  const ctaBlock = opts.cta
    ? `<tr><td style="padding:8px 32px 4px;">${ctaButton(opts.cta.label, opts.cta.href)}</td></tr>${
        opts.ctaFallback
          ? `<tr><td style="padding:4px 32px 0;font-size:10px;color:#5c6470;line-height:1.6;word-break:break-all;">Or paste this link: ${esc(opts.ctaFallback)}</td></tr>`
          : ""
      }`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="support-color-scheme" content="dark light"><title>${esc(opts.hero)}</title></head>
<body style="margin:0;padding:0;background:#08090a;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e7e5e1;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#08090a;padding:32px 12px;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:560px;background:#101215;border:1px solid #1e222a;">
        <tr><td style="padding:22px 32px;border-bottom:1px solid #1e222a;background:#15181d;">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="width:34px;height:34px;background:#ffb020;color:#08090a;font-weight:800;font-size:19px;text-align:center;vertical-align:middle;line-height:34px;font-family:ui-monospace,monospace;">M</td>
            <td style="padding-left:12px;">
              <div style="font-size:15px;font-weight:700;color:#ffb020;letter-spacing:.02em;">MERIDIAN</div>
              <div style="font-size:9px;color:#8c857a;letter-spacing:.18em;text-transform:uppercase;margin-top:2px;">Tradefort · Terminal v4.2</div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:30px 32px 0;font-size:9px;font-weight:700;color:#a8751a;letter-spacing:.18em;text-transform:uppercase;">${esc(opts.eyebrow)}</td></tr>
        <tr><td style="padding:10px 32px 18px;">
          <h1 style="margin:0 0 4px;font-size:24px;font-weight:600;color:#fbe8da;line-height:1.18;letter-spacing:-0.01em;font-family:Georgia,'Times New Roman',serif;">${esc(opts.hero)}</h1>
        </td></tr>
        <tr><td style="padding:0 32px 8px;font-size:14px;line-height:1.65;">
          ${opts.bodyHtml}
        </td></tr>
        ${ctaBlock}
        <tr><td style="padding:16px 32px 28px;">
          <p style="margin:0;font-size:13px;color:#8c857a;font-style:italic;font-family:Georgia,serif;">— The Tradefort desk</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #1e222a;background:#0c0d0f;">
          <p style="margin:0 0 8px;font-size:11px;line-height:1.6;color:#5c6470;">You're receiving this email because a Tradefort account is associated with this address. Trading leveraged products carries risk of total loss — trade only what you can afford to lose.</p>
          <p style="margin:0;font-size:10px;color:#4c5561;letter-spacing:.04em;text-transform:uppercase;">Tradefort · Nairobi · New York · London</p>
        </td></tr>
      </table>
      <p style="max-width:560px;margin:18px auto 0;font-size:11px;color:#4c5561;text-align:center;line-height:1.5;font-style:italic;font-family:Georgia,serif;">"The tape does not care how you feel about it."</p>
    </td></tr>
  </table>
</body></html>`;
}
