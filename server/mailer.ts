import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Task e-mails. Sends an e-mail to a team member when they get work in ContentFlow
 * (new task, reassignment, revision request, file ready for them to post).
 *
 * Configure in .env — works with Gmail (App Password), Hostinger Email, Zoho, etc.:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587               # 465 = SSL, 587 = STARTTLS
 *   SMTP_USER=yourname@gmail.com
 *   SMTP_PASS=your-app-password
 *   MAIL_FROM="ContentFlow <yourname@gmail.com>"   # optional, defaults to SMTP_USER
 *   APP_URL=https://content.quickuppsoftech.com    # link in the e-mail
 *
 * If SMTP_HOST is not set, e-mails are skipped (in-app notifications still work).
 * Sending never blocks or breaks the action that triggered it.
 */

let transporter: Transporter | null = null;
let warned = false;

export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

function getTransporter(): Transporter | null {
  if (!emailConfigured()) {
    if (!warned) {
      console.warn('✉️  Task e-mails are off — set SMTP_HOST, SMTP_USER and SMTP_PASS in .env to turn them on.');
      warned = true;
    }
    return null;
  }
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined,
    });
  }
  return transporter;
}

const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export interface TaskEmail {
  to: string;
  toName: string;
  subject: string;
  message: string;
  details?: [string, string][];
}

export function renderTaskEmail(mail: TaskEmail): { html: string; text: string } {
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const first = mail.toName.split(' ')[0] || mail.toName;
  const rows = (mail.details || [])
    .filter(([, v]) => v)
    .map(([k, v]) =>
      `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;white-space:nowrap;vertical-align:top">${esc(k)}</td>` +
      `<td style="padding:6px 0;color:#0f172a;font-size:13px">${esc(v)}</td></tr>`)
    .join('');
  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px">
<tr><td style="padding:20px 24px;border-bottom:1px solid #f1f5f9;font-weight:bold;font-size:16px;color:#0f172a">Quickupp ContentFlow</td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 12px;font-size:15px;color:#0f172a">Hi ${esc(first)},</p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.5;color:#0f172a">${esc(mail.message)}</p>
${rows ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px">${rows}</table>` : ''}
<a href="${esc(appUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:11px 18px;border-radius:9px">Open ContentFlow</a>
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #f1f5f9;font-size:12px;color:#94a3b8">You get this e-mail because a task was assigned to you in ContentFlow.</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    `Hi ${first},`,
    '',
    mail.message,
    '',
    ...(mail.details || []).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    '',
    `Open ContentFlow: ${appUrl}`,
  ].join('\n');
  return { html, text };
}

/** Fire-and-forget: returns immediately; errors are logged, never thrown. */
export function sendTaskEmail(mail: TaskEmail): void {
  const t = getTransporter();
  if (!t || !mail.to) return;
  const { html, text } = renderTaskEmail(mail);
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'ContentFlow <no-reply@localhost>';
  t.sendMail({ from, to: `"${mail.toName.replace(/"/g, '')}" <${mail.to}>`, subject: mail.subject, html, text })
    .then(() => console.log(`✉️  Task e-mail sent to ${mail.to}: ${mail.subject}`))
    .catch((err: any) => console.warn(`⚠️  Could not send e-mail to ${mail.to}: ${err.message}`));
}
