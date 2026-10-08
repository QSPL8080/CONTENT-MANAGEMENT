import fs from 'fs';
import path from 'path';
import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Task e-mails. Sends a branded e-mail to a team member when they get work in
 * Quickupp ContentOps (new task, reassignment, revision request, file ready for them to post).
 *
 * Configure in .env — works with Gmail (App Password), Hostinger Email, Zoho, etc.:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587               # 465 = SSL, 587 = STARTTLS
 *   SMTP_USER=yourname@gmail.com
 *   SMTP_PASS=your-app-password
 *   MAIL_FROM="Quickupp ContentOps <yourname@gmail.com>"   # optional
 *   APP_URL=https://content.quickuppsoftech.com            # the button in the e-mail opens this
 *
 * If SMTP_HOST is not set, e-mails are skipped (in-app notifications still work).
 * Sending never blocks or breaks the action that triggered it.
 */

const BRAND = 'Quickupp ContentOps';
const COMPANY = 'Quickupp Softech';
const LOGO_CID = 'quickupp-logo';

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

/** The logo is embedded in the e-mail itself, so it shows even before the site is online. */
function logoPath(): string | null {
  for (const p of [
    path.join(process.cwd(), 'public', 'email-logo.png'),
    path.join(process.cwd(), 'dist', 'email-logo.png'),
  ]) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export type TaskKind = 'assigned' | 'revision' | 'ready_to_post';

const KIND_STYLE: Record<TaskKind, { label: string; color: string; bg: string; button: string }> = {
  assigned:      { label: 'New task',           color: '#1d4ed8', bg: '#eff6ff', button: 'View task' },
  revision:      { label: 'Revision requested', color: '#b45309', bg: '#fffbeb', button: 'View revision' },
  ready_to_post: { label: 'Ready to post',      color: '#047857', bg: '#ecfdf5', button: 'Open and publish' },
};

export interface TaskEmail {
  to: string;
  toName: string;
  kind: TaskKind;
  subject: string;
  /** Main sentence, e.g. "Rahul assigned you to create …" */
  message: string;
  /** Content title shown as the heading */
  heading?: string;
  details?: [string, string][];
  /** Longer text shown in its own box (instructions / revision notes) */
  note?: { label: string; text: string };
}

export function renderTaskEmail(mail: TaskEmail, logoSrc: string | null): { html: string; text: string } {
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const first = mail.toName.split(' ')[0] || mail.toName;
  const k = KIND_STYLE[mail.kind];
  const year = new Date().getFullYear();
  const details = (mail.details || []).filter(([, v]) => v);

  const detailRows = details
    .map(([label, value], i) => `
              <tr>
                <td width="38%" style="padding:12px 16px;${i ? 'border-top:1px solid #e2e8f0;' : ''}font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#64748b;vertical-align:top">${esc(label)}</td>
                <td style="padding:12px 16px;${i ? 'border-top:1px solid #e2e8f0;' : ''}font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#0f172a;font-weight:bold;vertical-align:top">${esc(value)}</td>
              </tr>`)
    .join('');

  const logo = logoSrc
    ? `<img src="${esc(logoSrc)}" width="180" alt="${BRAND}" style="display:block;width:180px;max-width:180px;height:auto;border:0;outline:none;text-decoration:none">`
    : `<span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#0f172a">${BRAND}</span>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(mail.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(mail.message)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9" style="background-color:#f1f5f9">
  <tr>
    <td align="center" style="padding:32px 12px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">

        <!-- Card -->
        <tr>
          <td bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <!-- Brand bar -->
              <tr><td height="5" style="height:5px;line-height:5px;font-size:0;background-color:#6d28d9;background-image:linear-gradient(90deg,#0ea5e9,#6d28d9,#db2777);border-radius:16px 16px 0 0">&nbsp;</td></tr>
              <!-- Logo -->
              <tr>
                <td style="padding:28px 36px 20px 36px;border-bottom:1px solid #f1f5f9">${logo}</td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:30px 36px 8px 36px">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td bgcolor="${k.bg}" style="background-color:${k.bg};border-radius:999px;padding:5px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.6px;text-transform:uppercase;color:${k.color}">${k.label}</td>
                  </tr></table>
                  ${mail.heading ? `<h1 style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:30px;font-weight:bold;color:#0f172a">${esc(mail.heading)}</h1>` : ''}
                  <p style="margin:18px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#334155">Hi ${esc(first)},</p>
                  <p style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#334155">${esc(mail.message)}</p>
                </td>
              </tr>
              ${detailRows ? `
              <tr>
                <td style="padding:22px 36px 0 36px">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8fafc" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">${detailRows}
                  </table>
                </td>
              </tr>` : ''}
              ${mail.note && mail.note.text ? `
              <tr>
                <td style="padding:18px 36px 0 36px">
                  <p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;color:#64748b">${esc(mail.note.label)}</p>
                  <div style="border-left:3px solid ${k.color};padding:10px 14px;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#0f172a;white-space:pre-wrap">${esc(mail.note.text)}</div>
                </td>
              </tr>` : ''}
              <!-- Button -->
              <tr>
                <td style="padding:28px 36px 34px 36px">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td bgcolor="#0f172a" style="background-color:#0f172a;border-radius:10px">
                      <a href="${esc(appUrl)}" target="_blank" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px">${k.button} &rarr;</a>
                    </td>
                  </tr></table>
                  <p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#94a3b8">Or open: <a href="${esc(appUrl)}" style="color:#6d28d9;text-decoration:none">${esc(appUrl)}</a></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:22px 24px 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#94a3b8">
            You received this e-mail because a task was assigned to you in ${BRAND}.<br>
            This is an automated message — please do not reply.<br>
            &copy; ${year} ${COMPANY}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    `${k.label.toUpperCase()}${mail.heading ? ` — ${mail.heading}` : ''}`,
    '',
    `Hi ${first},`,
    '',
    mail.message,
    '',
    ...details.map(([label, value]) => `${label}: ${value}`),
    ...(mail.note && mail.note.text ? ['', `${mail.note.label}:`, mail.note.text] : []),
    '',
    `${k.button}: ${appUrl}`,
    '',
    '—',
    `${BRAND} · ${COMPANY}`,
    'This is an automated message — please do not reply.',
  ].join('\n');

  return { html, text };
}

/** Fire-and-forget: returns immediately; errors are logged, never thrown. */
export function sendTaskEmail(mail: TaskEmail): void {
  const t = getTransporter();
  if (!t || !mail.to) return;
  const logo = logoPath();
  const { html, text } = renderTaskEmail(mail, logo ? `cid:${LOGO_CID}` : null);
  const from = process.env.MAIL_FROM || (process.env.SMTP_USER ? `"${BRAND}" <${process.env.SMTP_USER}>` : `"${BRAND}" <no-reply@localhost>`);
  t.sendMail({
    from,
    to: `"${mail.toName.replace(/"/g, '')}" <${mail.to}>`,
    subject: mail.subject,
    html,
    text,
    attachments: logo ? [{ filename: 'quickupp-logo.png', path: logo, cid: LOGO_CID, contentDisposition: 'inline' }] : [],
  })
    .then(() => console.log(`✉️  Task e-mail sent to ${mail.to}: ${mail.subject}`))
    .catch((err: any) => console.warn(`⚠️  Could not send e-mail to ${mail.to}: ${err.message}`));
}
