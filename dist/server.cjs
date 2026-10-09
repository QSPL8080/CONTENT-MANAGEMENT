var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path5 = __toESM(require("path"), 1);
var import_fs7 = __toESM(require("fs"), 1);
var import_multer = __toESM(require("multer"), 1);

// server/db.ts
var import_pg2 = __toESM(require("pg"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);

// src/lib/roles.ts
var ALL_ROLES = [
  "admin",
  "manager",
  "graphic_designer",
  "editor",
  "poster"
];
var ROLE_LABELS = {
  admin: "Admin",
  manager: "Manager",
  graphic_designer: "Graphic Designer",
  editor: "Video Editor",
  poster: "Intern"
};
var roleLabel = (role) => role && ROLE_LABELS[role] || "Member";
var isValidRole = (role) => typeof role === "string" && ALL_ROLES.includes(role);
var isManagerial = (role) => role === "admin" || role === "manager";
var canManageTeam = (role) => role === "admin";
var canManageContent = (role) => role === "admin" || role === "manager";
var canDeleteContent = (role) => role === "admin" || role === "manager";
var isCreator = (role) => role === "graphic_designer" || role === "editor";
var isPoster = (role) => role === "poster";
var assignableRoles = (actorRole) => {
  if (actorRole === "admin") return ALL_ROLES;
  return [];
};

// server/team.ts
var TEAM_ROSTER = [
  // Admins
  { name: "Quickupp CMO", email: "quickuppsoftech.cmo@gmail.com", role: "admin", whatsapp: "8261890834" },
  { name: "Snehal Pawar", email: "snehalpawar12014@gmail.com", role: "admin", whatsapp: "8956583052" },
  // Manager (DMM) — email to be provided
  // { name: 'DMM', email: '<manager-email>@gmail.com', role: 'manager' },
  // Graphic Designers
  // NOTE: the SRS lists "qs.graphicdesingner@gamil.com" — "gamil" is treated as a typo for gmail.
  { name: "Devyani Ankush Bhoye", email: "qs.graphicdesingner@gmail.com", role: "graphic_designer" },
  { name: "Rutuja Ganesh Pawar", email: "qsgraphicdesigner2@gmail.com", role: "graphic_designer" },
  { name: "Swapnil Nawadkar", email: "quickupp.graphicdesigns@gmail.com", role: "graphic_designer" },
  // Video Editors
  { name: "Ubaid Maner", email: "dmquickuppsoftech@gmail.com", role: "editor" },
  { name: "Rahul Sanjay Mahajan", email: "qs.photography0079@gmail.com", role: "editor" },
  // Interns (posting interns)
  { name: "Pratiksha Magatrao", email: "qsdmintern01@gmail.com", role: "poster" },
  // NOTE: in the SRS this email sits between Pratiksha and Tanisha; assigned to Tanisha.
  { name: "Tanisha Suresh Bangde", email: "qsdmintern4@gmail.com", role: "poster" },
  { name: "Gayatri Ratnakar Sitafale", email: "qsintern009@gmail.com", role: "poster" },
  { name: "Kiran B Arote", email: "qsdmintern03@gmail.com", role: "poster" }
];

// server/vault.ts
var import_crypto = __toESM(require("crypto"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);

// server/paths.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var DATA_DIR = import_path.default.resolve(process.env.DATA_DIR || import_path.default.join(process.cwd(), "data"));
var UPLOADS_DIR = import_path.default.resolve(process.env.UPLOADS_DIR || import_path.default.join(process.cwd(), "uploads"));
var BUNDLED_UPLOADS = import_path.default.resolve(process.cwd(), "uploads");
if (UPLOADS_DIR !== BUNDLED_UPLOADS) {
  try {
    import_fs.default.mkdirSync(UPLOADS_DIR, { recursive: true });
    for (const f of import_fs.default.existsSync(BUNDLED_UPLOADS) ? import_fs.default.readdirSync(BUNDLED_UPLOADS) : []) {
      if (!/^sample-reel-\d+\.mp4$/.test(f)) continue;
      const target = import_path.default.join(UPLOADS_DIR, f);
      if (!import_fs.default.existsSync(target)) import_fs.default.copyFileSync(import_path.default.join(BUNDLED_UPLOADS, f), target);
    }
  } catch (err) {
    console.warn(`\u26A0\uFE0F  Could not prepare UPLOADS_DIR (${UPLOADS_DIR}): ${err.message}`);
  }
}

// server/vault.ts
var KEY_FILE = import_path2.default.join(DATA_DIR, ".vault-key");
var cachedKey = null;
var sharedKey = null;
function envVaultKey() {
  const fromEnv = (process.env.PASSWORD_VAULT_KEY || "").trim();
  return /^[0-9a-f]{64}$/i.test(fromEnv) ? fromEnv.toLowerCase() : null;
}
function setSharedVaultKey(hex) {
  if (/^[0-9a-f]{64}$/i.test(hex)) sharedKey = Buffer.from(hex, "hex");
}
function newVaultKeyHex() {
  return import_crypto.default.randomBytes(32).toString("hex");
}
function getKey() {
  const fromEnv = envVaultKey();
  if (fromEnv) return Buffer.from(fromEnv, "hex");
  if (sharedKey) return sharedKey;
  if (cachedKey) return cachedKey;
  try {
    const fromFile = import_fs2.default.readFileSync(KEY_FILE, "utf8").trim();
    if (/^[0-9a-f]{64}$/i.test(fromFile)) {
      cachedKey = Buffer.from(fromFile, "hex");
      return cachedKey;
    }
  } catch {
  }
  const key = import_crypto.default.randomBytes(32);
  import_fs2.default.mkdirSync(import_path2.default.dirname(KEY_FILE), { recursive: true });
  import_fs2.default.writeFileSync(KEY_FILE, key.toString("hex"), { mode: 384 });
  cachedKey = key;
  return key;
}
function encryptPassword(plain) {
  const iv = import_crypto.default.randomBytes(12);
  const cipher = import_crypto.default.createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}
function allKeys() {
  const keys = [getKey()];
  if (sharedKey && !keys.some((k) => k.equals(sharedKey))) keys.push(sharedKey);
  const add = (hex) => {
    const h = hex.trim();
    if (/^[0-9a-f]{64}$/i.test(h) && !keys.some((k) => k.toString("hex") === h.toLowerCase())) {
      keys.push(Buffer.from(h, "hex"));
    }
  };
  (process.env.PASSWORD_VAULT_OLD_KEYS || "").split(/[\s,;]+/).forEach(add);
  try {
    add(import_fs2.default.readFileSync(KEY_FILE, "utf8"));
  } catch {
  }
  return keys;
}
function decryptPassword(stored) {
  if (!stored || !stored.startsWith("v1:")) return null;
  const [, ivB64, tagB64, ctB64] = stored.split(":");
  for (const key of allKeys()) {
    try {
      const decipher = import_crypto.default.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
      decipher.setAuthTag(Buffer.from(tagB64, "base64"));
      return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8");
    } catch {
    }
  }
  return null;
}

// server/pgConfig.ts
var import_fs3 = __toESM(require("fs"), 1);
function isLocalDatabase(url) {
  try {
    const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
    return ["localhost", "127.0.0.1", "::1", ""].includes(host);
  } catch {
    return true;
  }
}
function usesSsl(url) {
  const mode = String(process.env.DATABASE_SSL || "auto").toLowerCase();
  if (["false", "disable", "off", "0", "no"].includes(mode)) return false;
  if (["true", "require", "on", "1", "yes"].includes(mode)) return true;
  return !isLocalDatabase(url);
}
function pgConnectionConfig(url) {
  let connectionString = url;
  try {
    const u = new URL(url);
    ["sslmode", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"].forEach((k) => u.searchParams.delete(k));
    connectionString = u.toString();
  } catch {
  }
  const config = {
    connectionString,
    connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 15e3
  };
  if (usesSsl(url)) {
    const caPath = process.env.DATABASE_SSL_CA;
    config.ssl = caPath && import_fs3.default.existsSync(caPath) ? { ca: import_fs3.default.readFileSync(caPath, "utf8"), rejectUnauthorized: true } : { rejectUnauthorized: false };
  }
  return config;
}

// server/carryOver.ts
var import_fs4 = __toESM(require("fs"), 1);
var import_path3 = __toESM(require("path"), 1);
var import_pg = __toESM(require("pg"), 1);
var TABLES_IN_ORDER = ["workspaces", "users", "settings", "content_items", "activity_logs", "issues", "notifications"];
var ACCOUNTS_BACKUP_FILE = import_path3.default.join(DATA_DIR, "accounts-backup.json");
var ACCOUNT_COLUMNS = ["id", "name", "email", "password_hash", "password_enc", "avatar", "role", "status", "workspace_id", "whatsapp", "created_at", "updated_at"];
async function columnsOf(db2, table) {
  const { rows } = await db2.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = $1`,
    [table]
  );
  return rows.map((r) => r.column_name);
}
function quoteList(cols) {
  return cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(", ");
}
async function copyFromPreviousDatabase(target, previousUrl) {
  const source = new import_pg.default.Client(pgConnectionConfig(previousUrl));
  await source.connect();
  try {
    const sourceUsers = await source.query("SELECT COUNT(*)::int AS n FROM users").catch(() => null);
    if (!sourceUsers || !sourceUsers.rows[0].n) return null;
    const copied = {};
    await target.query("BEGIN");
    try {
      await target.query("DELETE FROM settings");
      await target.query("DELETE FROM workspaces");
      for (const table of TABLES_IN_ORDER) {
        const srcCols = await columnsOf(source, table);
        if (srcCols.length === 0) continue;
        const tgtCols = await columnsOf(target, table);
        const cols = srcCols.filter((c) => tgtCols.includes(c));
        const { rows } = await source.query(`SELECT COALESCE(json_agg(t), '[]'::json) AS data FROM ${table} t`);
        const data = rows[0].data;
        copied[table] = data.length;
        if (data.length === 0) continue;
        const list = quoteList(cols);
        await target.query(
          `INSERT INTO ${table} (${list}) SELECT ${list} FROM json_populate_recordset(NULL::${table}, $1::json)`,
          [JSON.stringify(data)]
        );
      }
      await target.query(
        `SELECT setval(pg_get_serial_sequence('settings', 'id'), COALESCE((SELECT MAX(id) FROM settings), 1))`
      );
      await target.query("COMMIT");
      return copied;
    } catch (err) {
      await target.query("ROLLBACK").catch(() => {
      });
      throw err;
    }
  } finally {
    await source.end().catch(() => {
    });
  }
}
async function saveAccountsBackup(db2) {
  try {
    const have = await columnsOf(db2, "users");
    const cols = ACCOUNT_COLUMNS.filter((c) => have.includes(c));
    const { rows } = await db2.query(`SELECT ${quoteList(cols)} FROM users ORDER BY created_at`);
    if (rows.length === 0) return;
    import_fs4.default.mkdirSync(import_path3.default.dirname(ACCOUNTS_BACKUP_FILE), { recursive: true });
    const tmp = `${ACCOUNTS_BACKUP_FILE}.tmp`;
    import_fs4.default.writeFileSync(
      tmp,
      JSON.stringify({ saved_at: (/* @__PURE__ */ new Date()).toISOString(), accounts: rows }, null, 2),
      { mode: 384 }
    );
    import_fs4.default.renameSync(tmp, ACCOUNTS_BACKUP_FILE);
  } catch (err) {
    console.warn(`\u26A0\uFE0F  Could not save accounts backup: ${err.message}`);
  }
}
async function restoreAccountsBackup(target) {
  if (!import_fs4.default.existsSync(ACCOUNTS_BACKUP_FILE)) return 0;
  let accounts = [];
  try {
    accounts = JSON.parse(import_fs4.default.readFileSync(ACCOUNTS_BACKUP_FILE, "utf8")).accounts || [];
  } catch (err) {
    console.warn(`\u26A0\uFE0F  Accounts backup is unreadable, ignoring it: ${err.message}`);
    return 0;
  }
  if (accounts.length === 0) return 0;
  const have = await columnsOf(target, "users");
  const cols = ACCOUNT_COLUMNS.filter((c) => have.includes(c) && c !== "workspace_id");
  const list = quoteList(cols);
  const res = await target.query(
    `INSERT INTO users (${list}) SELECT ${list} FROM json_populate_recordset(NULL::users, $1::json)
     ON CONFLICT DO NOTHING`,
    [JSON.stringify(accounts)]
  );
  return res.rowCount || 0;
}

// server/mailer.ts
var import_nodemailer = __toESM(require("nodemailer"), 1);
var BRAND = "Quickupp ContentOps";
var COMPANY = "Quickupp Softech";
var LIVE_APP_URL = "https://legalclaimscouncel.us";
function emailAppUrl() {
  const configured = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
  if (!configured || /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(configured)) return LIVE_APP_URL;
  return configured;
}
var transporter = null;
var warned = false;
function emailConfigured() {
  return Boolean(process.env.SMTP_HOST);
}
function getTransporter() {
  if (!emailConfigured()) {
    if (!warned) {
      console.warn("\u2709\uFE0F  Task e-mails are off \u2014 set SMTP_HOST, SMTP_USER and SMTP_PASS in .env to turn them on.");
      warned = true;
    }
    return null;
  }
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
    transporter = import_nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" } : void 0
    });
  }
  return transporter;
}
var esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var KIND_STYLE = {
  assigned: { label: "New task", color: "#1d4ed8", bg: "#eff6ff", button: "View task" },
  revision: { label: "Revision requested", color: "#b45309", bg: "#fffbeb", button: "View revision" },
  ready_to_post: { label: "Ready to post", color: "#047857", bg: "#ecfdf5", button: "Open and publish" }
};
function renderTaskEmail(mail, logoSrc) {
  const appUrl = emailAppUrl();
  const first = mail.toName.split(" ")[0] || mail.toName;
  const k = KIND_STYLE[mail.kind];
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const details = (mail.details || []).filter(([, v]) => v);
  const detailRows = details.map(([label, value], i) => `
              <tr>
                <td width="38%" style="padding:12px 16px;${i ? "border-top:1px solid #e2e8f0;" : ""}font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#64748b;vertical-align:top">${esc(label)}</td>
                <td style="padding:12px 16px;${i ? "border-top:1px solid #e2e8f0;" : ""}font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#0f172a;font-weight:bold;vertical-align:top">${esc(value)}</td>
              </tr>`).join("");
  const logo = logoSrc ? `<img src="${esc(logoSrc)}" width="200" alt="${BRAND}" style="display:block;width:200px;max-width:200px;height:auto;border:0;outline:none;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#0f172a">` : `<span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#0f172a">${BRAND}</span>`;
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
                  ${mail.heading ? `<h1 style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:30px;font-weight:bold;color:#0f172a">${esc(mail.heading)}</h1>` : ""}
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
              </tr>` : ""}
              ${mail.note && mail.note.text ? `
              <tr>
                <td style="padding:18px 36px 0 36px">
                  <p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;color:#64748b">${esc(mail.note.label)}</p>
                  <div style="border-left:3px solid ${k.color};padding:10px 14px;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#0f172a;white-space:pre-wrap">${esc(mail.note.text)}</div>
                </td>
              </tr>` : ""}
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
            This is an automated message \u2014 please do not reply.<br>
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
    `${k.label.toUpperCase()}${mail.heading ? ` \u2014 ${mail.heading}` : ""}`,
    "",
    `Hi ${first},`,
    "",
    mail.message,
    "",
    ...details.map(([label, value]) => `${label}: ${value}`),
    ...mail.note && mail.note.text ? ["", `${mail.note.label}:`, mail.note.text] : [],
    "",
    `${k.button}: ${appUrl}`,
    "",
    "\u2014",
    `${BRAND} \xB7 ${COMPANY}`,
    "This is an automated message \u2014 please do not reply."
  ].join("\n");
  return { html, text };
}
function sendTaskEmail(mail) {
  const t = getTransporter();
  if (!t || !mail.to) return;
  const logoUrl = process.env.EMAIL_LOGO_URL || `${emailAppUrl()}/email-logo.png`;
  const { html, text } = renderTaskEmail(mail, logoUrl);
  const from = process.env.MAIL_FROM || (process.env.SMTP_USER ? `"${BRAND}" <${process.env.SMTP_USER}>` : `"${BRAND}" <no-reply@localhost>`);
  t.sendMail({
    from,
    to: `"${mail.toName.replace(/"/g, "")}" <${mail.to}>`,
    subject: mail.subject,
    html,
    text
  }).then(() => console.log(`\u2709\uFE0F  Task e-mail sent to ${mail.to}: ${mail.subject}`)).catch((err) => console.warn(`\u26A0\uFE0F  Could not send e-mail to ${mail.to}: ${err.message}`));
}

// server/push.ts
var import_web_push = __toESM(require("web-push"), 1);
var ready = false;
var publicKey = "";
function pushPublicKey() {
  return publicKey;
}
async function initPush(pool2) {
  try {
    const { rows } = await pool2.query("SELECT vapid_public, vapid_private FROM settings ORDER BY id LIMIT 1");
    if (!rows[0]?.vapid_public || !rows[0]?.vapid_private) {
      const keys = import_web_push.default.generateVAPIDKeys();
      await pool2.query(
        `UPDATE settings SET vapid_public = $1, vapid_private = $2
          WHERE id = (SELECT MIN(id) FROM settings) AND vapid_public IS NULL`,
        [keys.publicKey, keys.privateKey]
      );
    }
    const { rows: k } = await pool2.query(
      "SELECT vapid_public, vapid_private FROM settings WHERE vapid_public IS NOT NULL ORDER BY id LIMIT 1"
    );
    if (!k[0]) return;
    const contact = process.env.SMTP_USER || "admin@quickuppsoftech.com";
    import_web_push.default.setVapidDetails(`mailto:${contact}`, k[0].vapid_public, k[0].vapid_private);
    publicKey = k[0].vapid_public;
    ready = true;
  } catch (err) {
    console.warn(`\u26A0\uFE0F  Desktop push pop-ups unavailable: ${err.message}`);
  }
}
async function saveSubscription(pool2, userId, sub) {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return false;
  await pool2.query(
    `INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [sub.endpoint, userId, sub.keys.p256dh, sub.keys.auth]
  );
  return true;
}
async function removeSubscription(pool2, endpoint) {
  await pool2.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
}
var ACTIVITY_TITLES = {
  created_content: "\u{1F195} New task created",
  reassigned_creator: "\u{1F464} Task assigned",
  reassigned_poster: "\u{1F464} Intern assigned",
  status_changed: "\u{1F504} Status changed",
  uploaded_final_video: "\u{1F4E4} Final file uploaded \u2014 ready to post",
  replaced_final_video: "\u{1F4E4} Final file replaced",
  revision_requested: "\u270F\uFE0F Revision requested",
  reported_issue: "\u26A0\uFE0F Issue reported",
  resolved_issue: "\u2705 Issue resolved",
  marked_posted: "\u2705 Posted",
  added_post_url: "\u{1F517} Post link added",
  date_changed: "\u{1F4C5} Rescheduled",
  edited_content: "\u{1F4DD} Content edited",
  deleted_content: "\u{1F5D1}\uFE0F Content deleted",
  duplicated_content: "\u{1F4C4} Content duplicated",
  downloaded_video: "\u2B07\uFE0F File downloaded",
  editor_notes: "\u{1F5D2}\uFE0F Notes added",
  password_changed: "\u{1F511} Password changed",
  password_viewed: "\u{1F441}\uFE0F Password viewed",
  user_added: "\u{1F465} Team member added",
  user_updated: "\u{1F465} Team member updated",
  user_deleted: "\u{1F465} Team member deleted",
  settings_updated: "\u2699\uFE0F Settings changed"
};

// server/db.ts
import_dotenv.default.config();
var { Pool } = import_pg2.default;
var TASK_EMAIL_TYPES = /* @__PURE__ */ new Set(["assigned", "revision", "ready_to_post"]);
import_pg2.default.types.setTypeParser(1082, (v) => v);
var DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:8080@localhost:5432/content_management";
var pool = new Pool({
  ...pgConnectionConfig(DATABASE_URL),
  max: Number(process.env.DB_POOL_MAX) || 10
});
async function ensureDatabaseExists() {
  let dbName = "";
  let adminUrl = "";
  try {
    const url = new URL(DATABASE_URL);
    dbName = decodeURIComponent(url.pathname.replace(/^\//, ""));
    url.pathname = "/postgres";
    adminUrl = url.toString();
  } catch {
    return;
  }
  if (!dbName || dbName === "postgres") return;
  const admin = new import_pg2.default.Client(pgConnectionConfig(adminUrl));
  try {
    await admin.connect();
    const { rows } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (rows.length === 0) {
      await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
      console.log(`\u2705 Created PostgreSQL database "${dbName}"`);
    }
  } catch (err) {
    console.warn(`\u26A0\uFE0F  Could not check/create database "${dbName}" automatically: ${err.message}`);
  } finally {
    await admin.end().catch(() => {
    });
  }
}
pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});
var ROLE_CHECK = `CHECK (role IN ('admin','manager','graphic_designer','editor','poster'))`;
var SCHEMA_SQL = `
-- SRS 7.5: Workspace \u2192 Users \u2192 Content \u2192 Calendar (v1 runs one workspace: 'default')
CREATE TABLE IF NOT EXISTS workspaces (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO workspaces (id, name) VALUES ('default', 'Quickupp Softech') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL DEFAULT '',
  avatar         TEXT NOT NULL DEFAULT '',
  role           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  workspace_id   TEXT NOT NULL DEFAULT 'default',
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_items (
  id                   TEXT PRIMARY KEY,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  content_type         TEXT NOT NULL DEFAULT 'reel',
  platform             TEXT NOT NULL DEFAULT 'instagram',
  category             TEXT NOT NULL DEFAULT 'Education',
  scheduled_date       DATE NOT NULL,
  scheduled_time       TIME NOT NULL,
  editor_id            TEXT REFERENCES users(id) ON DELETE SET NULL,
  poster_id            TEXT REFERENCES users(id) ON DELETE SET NULL,
  caption              TEXT NOT NULL DEFAULT '',
  hashtags             TEXT NOT NULL DEFAULT '',
  instructions         TEXT NOT NULL DEFAULT '',
  video_url            TEXT,
  video_filename       TEXT,
  video_filesize       BIGINT,
  video_uploaded_at    TIMESTAMPTZ,
  video_uploaded_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  thumbnail_url        TEXT,
  status               TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','EDITING','READY_TO_POST','POSTED','REVISION','ISSUE')),
  post_url             TEXT,
  posted_at            TIMESTAMPTZ,
  posted_by            TEXT REFERENCES users(id) ON DELETE SET NULL,
  posting_notes        TEXT,
  reference_file_url   TEXT,
  reference_notes      TEXT,
  internal_notes       TEXT,
  editor_notes         TEXT,
  tags                 TEXT[] NOT NULL DEFAULT '{}',
  workspace_id         TEXT NOT NULL DEFAULT 'default',
  created_by           TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id          TEXT PRIMARY KEY,
  content_id  TEXT REFERENCES content_items(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  user_name   TEXT,
  user_role   TEXT,
  action      TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS issues (
  id             TEXT PRIMARY KEY,
  content_id     TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  content_title  TEXT,
  reported_by    TEXT NOT NULL,
  reporter_name  TEXT,
  issue_type     TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED')),
  resolved_by    TEXT,
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL DEFAULT '',
  content_id  TEXT REFERENCES content_items(id) ON DELETE CASCADE,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  type        TEXT NOT NULL DEFAULT 'general',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id                  SERIAL PRIMARY KEY,
  workspace_name      TEXT NOT NULL DEFAULT 'ContentFlow',
  default_timezone    TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  default_platform    TEXT NOT NULL DEFAULT 'instagram',
  allow_editor_replace BOOLEAN NOT NULL DEFAULT TRUE,
  notification_email  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash      TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acting_as_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  auth_method     TEXT NOT NULL DEFAULT 'password',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL
);

-- Columns added after v1 (no-ops on fresh databases)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_enc TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS popups_seen_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS credentials_version INT NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS vault_key TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS vapid_public TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS vapid_private TEXT;
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint    TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions (user_id);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_cleanup_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS retention_days INT NOT NULL DEFAULT 90;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS editor_notes TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS workspace_id TEXT NOT NULL DEFAULT 'default';
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_workspace_fk') THEN ALTER TABLE users ADD CONSTRAINT users_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_workspace_fk') THEN ALTER TABLE content_items ADD CONSTRAINT content_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id); END IF; END $$;

-- Role list: admin, manager, graphic_designer, editor (video editor), poster (intern)
DELETE FROM users WHERE role NOT IN ('admin','manager','graphic_designer','editor','poster');
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check ${ROLE_CHECK};

CREATE INDEX IF NOT EXISTS idx_content_date    ON content_items (scheduled_date, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_content_editor  ON content_items (editor_id);
CREATE INDEX IF NOT EXISTS idx_content_poster  ON content_items (poster_id);
CREATE INDEX IF NOT EXISTS idx_logs_content    ON activity_logs (content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user      ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_content  ON issues (content_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user   ON sessions (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

INSERT INTO settings (workspace_name, default_timezone, default_platform, allow_editor_replace, notification_email)
SELECT 'ContentFlow', 'Asia/Kolkata', 'instagram', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM settings);
`;
function activityPopupType(action) {
  switch (action) {
    case "created_content":
    case "reassigned_creator":
    case "reassigned_poster":
      return "assigned";
    case "uploaded_final_video":
    case "replaced_final_video":
      return "ready_to_post";
    case "marked_posted":
    case "added_post_url":
      return "posted";
    case "revision_requested":
      return "revision";
    case "reported_issue":
      return "issue";
    default:
      return "general";
  }
}
function iso(v) {
  return new Date(v).toISOString();
}
function rowToUser(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    avatar: r.avatar,
    role: r.role,
    status: r.status,
    has_password: Boolean(r.password_hash),
    must_change_password: Boolean(r.must_change_password),
    last_login_at: r.last_login_at ? iso(r.last_login_at) : void 0,
    whatsapp: r.whatsapp || "",
    created_at: iso(r.created_at),
    updated_at: iso(r.updated_at)
  };
}
function rowToContent(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    content_type: r.content_type,
    platform: r.platform,
    category: r.category,
    scheduled_date: String(r.scheduled_date).slice(0, 10),
    scheduled_time: String(r.scheduled_time).slice(0, 5),
    editor_id: r.editor_id,
    poster_id: r.poster_id,
    caption: r.caption,
    hashtags: r.hashtags,
    instructions: r.instructions,
    video_url: r.video_url ?? void 0,
    video_filename: r.video_filename ?? void 0,
    video_filesize: r.video_filesize != null ? Number(r.video_filesize) : void 0,
    video_uploaded_at: r.video_uploaded_at ? iso(r.video_uploaded_at) : void 0,
    video_uploaded_by: r.video_uploaded_by ?? void 0,
    thumbnail_url: r.thumbnail_url ?? void 0,
    status: r.status,
    post_url: r.post_url ?? void 0,
    posted_at: r.posted_at ? iso(r.posted_at) : void 0,
    posted_by: r.posted_by ?? void 0,
    posting_notes: r.posting_notes ?? void 0,
    reference_file_url: r.reference_file_url ?? void 0,
    reference_notes: r.reference_notes ?? void 0,
    internal_notes: r.internal_notes ?? void 0,
    editor_notes: r.editor_notes ?? void 0,
    tags: r.tags ?? [],
    created_by: r.created_by,
    created_at: iso(r.created_at),
    updated_at: iso(r.updated_at)
  };
}
function rowToLog(r) {
  return {
    id: r.id,
    content_id: r.content_id ?? void 0,
    user_id: r.user_id,
    user_name: r.user_name ?? void 0,
    user_role: r.user_role ?? void 0,
    action: r.action,
    description: r.description,
    metadata: r.metadata ?? void 0,
    created_at: iso(r.created_at)
  };
}
function rowToIssue(r) {
  return {
    id: r.id,
    content_id: r.content_id,
    content_title: r.content_title ?? void 0,
    reported_by: r.reported_by,
    reporter_name: r.reporter_name ?? void 0,
    issue_type: r.issue_type,
    description: r.description,
    status: r.status,
    resolved_by: r.resolved_by ?? void 0,
    resolved_at: r.resolved_at ? iso(r.resolved_at) : void 0,
    created_at: iso(r.created_at)
  };
}
function rowToNotif(r) {
  return {
    id: r.id,
    user_id: r.user_id,
    title: r.title,
    message: r.message,
    content_id: r.content_id ?? void 0,
    read: r.read,
    type: r.type,
    created_at: iso(r.created_at)
  };
}
function rowToSettings(r) {
  return {
    workspace_name: r.workspace_name,
    default_timezone: r.default_timezone,
    default_platform: r.default_platform,
    allow_editor_replace: r.allow_editor_replace !== void 0 ? Boolean(r.allow_editor_replace) : true,
    notification_email: r.notification_email !== void 0 ? Boolean(r.notification_email) : true,
    auto_cleanup_enabled: r.auto_cleanup_enabled !== void 0 ? Boolean(r.auto_cleanup_enabled) : true,
    retention_days: Number(r.retention_days) || 90
  };
}
function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}
var STATUS_LABELS = {
  PLANNED: "Planned",
  EDITING: "Editing",
  READY_TO_POST: "Ready to Post",
  POSTED: "Posted",
  REVISION: "Revision",
  ISSUE: "Issue"
};
function nowInTimezone(tz) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(/* @__PURE__ */ new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value || "00";
    return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
  } catch {
    const d = /* @__PURE__ */ new Date();
    return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
  }
}
function visibilityClause(viewer, startIdx, alias = "") {
  if (!viewer || isManagerial(viewer.role)) return { sql: "", vals: [] };
  const a = alias ? `${alias}.` : "";
  return { sql: `(${a}editor_id = $${startIdx} OR ${a}poster_id = $${startIdx})`, vals: [viewer.id] };
}
var RelationalDatabase = class {
  // ------------------------------------------------------------------
  // Users
  // ------------------------------------------------------------------
  async getUsers() {
    const { rows } = await pool.query("SELECT * FROM users ORDER BY created_at");
    return rows.map(rowToUser);
  }
  async getUserById(id) {
    if (!id) return void 0;
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return rows[0] ? rowToUser(rows[0]) : void 0;
  }
  async getUserByEmail(email) {
    const { rows } = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email.trim()]);
    if (!rows[0]) return void 0;
    return {
      ...rowToUser(rows[0]),
      password_hash: rows[0].password_hash || ""
    };
  }
  /** Email + password sign-in. Accounts without a password (not yet set by an Admin) cannot sign in. */
  async verifyUserPassword(email, plainPassword) {
    const userWithHash = await this.getUserByEmail(email);
    if (!userWithHash || !userWithHash.password_hash || !plainPassword) return null;
    const match = await import_bcryptjs.default.compare(plainPassword, userWithHash.password_hash);
    if (!match) return null;
    try {
      const { rows } = await pool.query("SELECT password_enc FROM users WHERE id = $1", [userWithHash.id]);
      if (decryptPassword(rows[0]?.password_enc) !== plainPassword) {
        await pool.query("UPDATE users SET password_enc = $1 WHERE id = $2", [encryptPassword(plainPassword), userWithHash.id]);
        await saveAccountsBackup(pool);
      }
    } catch (err) {
      console.warn(`\u26A0\uFE0F  Could not refresh stored password copy: ${err.message}`);
    }
    const { password_hash, ...safeUser } = userWithHash;
    return safeUser;
  }
  async countActiveAdmins(excludeUserId) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin' AND status = 'active' AND id <> $1`,
      [excludeUserId || ""]
    );
    return rows[0].n;
  }
  /**
   * Permanently removes an account. Their content stays (designer/intern fields become
   * "Unassigned"), the activity history keeps their name, and they are signed out everywhere.
   */
  async deleteUser(id) {
    const client2 = await pool.connect();
    try {
      await client2.query("BEGIN");
      await client2.query("DELETE FROM notifications WHERE user_id = $1", [id]);
      await client2.query("DELETE FROM sessions WHERE user_id = $1", [id]);
      const { rowCount } = await client2.query("DELETE FROM users WHERE id = $1", [id]);
      await client2.query("COMMIT");
      if (rowCount) await saveAccountsBackup(pool);
      return (rowCount ?? 0) > 0;
    } catch (err) {
      await client2.query("ROLLBACK").catch(() => {
      });
      throw err;
    } finally {
      client2.release();
    }
  }
  /**
   * Quick start for an EXISTING database: load the shared keys and start serving requests
   * straight away (a couple of queries), while init() finishes its upgrade checks in the
   * background. Returns false for a new/empty database, which must wait for init().
   */
  async quickStart() {
    try {
      const { rows } = await pool.query(
        "SELECT vault_key FROM settings WHERE vault_key IS NOT NULL ORDER BY id LIMIT 1"
      );
      const { rows: u } = await pool.query("SELECT COUNT(*)::int AS n FROM users");
      if (!rows[0]?.vault_key || !u[0]?.n) return false;
      setSharedVaultKey(rows[0].vault_key);
      await initPush(pool);
      return true;
    } catch {
      return false;
    }
  }
  async createUser(user) {
    const id = newId("user");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const passwordHash = user.password ? await import_bcryptjs.default.hash(user.password, 10) : "";
    const passwordEnc = user.password ? encryptPassword(user.password) : null;
    const { rows } = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, password_enc, avatar, role, status, must_change_password, whatsapp, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [id, user.name.trim(), user.email.trim().toLowerCase(), passwordHash, passwordEnc, user.avatar || "", user.role, user.status || "active", Boolean(user.must_change_password), user.whatsapp || "", now, now]
    );
    await saveAccountsBackup(pool);
    return rowToUser(rows[0]);
  }
  async updateUser(id, updates) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const sets = [];
    const vals = [];
    let i = 1;
    const allowed = ["name", "email", "avatar", "role", "status", "whatsapp"];
    for (const key of allowed) {
      if (key in updates && updates[key] !== void 0) {
        let v = updates[key];
        if (key === "email") v = String(v).trim().toLowerCase();
        if (key === "name") v = String(v).trim();
        sets.push(`${key} = $${i++}`);
        vals.push(v);
      }
    }
    if (updates.password) {
      const passwordHash = await import_bcryptjs.default.hash(updates.password, 10);
      sets.push(`password_hash = $${i++}`);
      vals.push(passwordHash);
      sets.push(`password_enc = $${i++}`);
      vals.push(encryptPassword(updates.password));
    }
    if (updates.must_change_password !== void 0) {
      sets.push(`must_change_password = $${i++}`);
      vals.push(Boolean(updates.must_change_password));
    }
    if (sets.length === 0) {
      return await this.getUserById(id) ?? null;
    }
    sets.push(`updated_at = $${i++}`);
    vals.push(now);
    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      vals
    );
    await saveAccountsBackup(pool);
    return rows[0] ? rowToUser(rows[0]) : null;
  }
  async touchLastLogin(userId, avatar) {
    if (avatar) {
      await pool.query(
        `UPDATE users SET last_login_at = NOW(),
           avatar = CASE WHEN avatar = '' OR avatar LIKE 'https://api.dicebear.com/%' OR avatar LIKE 'https://lh3.googleusercontent.com/%' THEN $2 ELSE avatar END
         WHERE id = $1`,
        [userId, avatar]
      );
    } else {
      await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [userId]);
    }
  }
  // ------------------------------------------------------------------
  // Sessions
  // ------------------------------------------------------------------
  async createSession(tokenHash, userId, method, ttlDays) {
    await pool.query(
      `INSERT INTO sessions (token_hash, user_id, auth_method, expires_at)
       VALUES ($1, $2, $3, NOW() + ($4 || ' days')::interval)`,
      [tokenHash, userId, method, String(ttlDays)]
    );
    pool.query("DELETE FROM sessions WHERE expires_at < NOW()").catch(() => {
    });
  }
  async getSession(tokenHash) {
    const { rows } = await pool.query(
      "SELECT * FROM sessions WHERE token_hash = $1 AND expires_at > NOW()",
      [tokenHash]
    );
    const s = rows[0];
    if (!s) return null;
    const realUser = await this.getUserById(s.user_id);
    if (!realUser || realUser.status !== "active") return null;
    return { user: realUser, realUser, actingAs: false };
  }
  async deleteSession(tokenHash) {
    await pool.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
  }
  async deleteSessionsForUser(userId, exceptTokenHash) {
    await pool.query("DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2", [userId, exceptTokenHash || ""]);
  }
  /** Check a user's current password (for "Change password"). */
  async checkPassword(userId, plainPassword) {
    const { rows } = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
    if (!rows[0]?.password_hash || !plainPassword) return false;
    return import_bcryptjs.default.compare(plainPassword, rows[0].password_hash);
  }
  /** Admin only (checked in the route): the user's current password, if it can be shown. */
  async revealPassword(userId) {
    const { rows } = await pool.query("SELECT password_hash, password_enc FROM users WHERE id = $1", [userId]);
    const row = rows[0];
    if (!row) return null;
    const shown = decryptPassword(row.password_enc);
    if (shown !== null) return shown;
    const candidates = [...new Set([process.env.TEAM_DEFAULT_PASSWORD, "Quickupp@123"].filter(Boolean))];
    for (const candidate of candidates) {
      if (row.password_hash && await import_bcryptjs.default.compare(candidate, row.password_hash)) {
        await pool.query("UPDATE users SET password_enc = $1 WHERE id = $2", [encryptPassword(candidate), userId]);
        await saveAccountsBackup(pool);
        return candidate;
      }
    }
    return null;
  }
  async setMustChangePassword(userId, value) {
    await pool.query("UPDATE users SET must_change_password = $1 WHERE id = $2", [value, userId]);
  }
  // ------------------------------------------------------------------
  // Content
  // ------------------------------------------------------------------
  async getContentList(filters) {
    const conditions = [];
    const vals = [];
    let i = 1;
    const vis = visibilityClause(filters?.visibleTo, i);
    if (vis.sql) {
      conditions.push(vis.sql);
      vals.push(...vis.vals);
      i += vis.vals.length;
    }
    if (filters?.status) {
      conditions.push(`status = $${i++}`);
      vals.push(filters.status);
    }
    if (filters?.editor_id) {
      conditions.push(`editor_id = $${i++}`);
      vals.push(filters.editor_id);
    }
    if (filters?.poster_id) {
      conditions.push(`poster_id = $${i++}`);
      vals.push(filters.poster_id);
    }
    if (filters?.platform) {
      conditions.push(`platform = $${i++}`);
      vals.push(filters.platform);
    }
    if (filters?.date) {
      conditions.push(`scheduled_date = $${i++}`);
      vals.push(filters.date);
    }
    if (filters?.search) {
      const q = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        `(LOWER(title) LIKE $${i} OR LOWER(caption) LIKE $${i} OR LOWER(hashtags) LIKE $${i} OR LOWER(platform) LIKE $${i})`
      );
      vals.push(q);
      i++;
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT * FROM content_items ${where} ORDER BY scheduled_date ASC, scheduled_time ASC`,
      vals
    );
    return rows.map(rowToContent);
  }
  async getContentById(id) {
    const { rows } = await pool.query("SELECT * FROM content_items WHERE id = $1", [id]);
    return rows[0] ? rowToContent(rows[0]) : void 0;
  }
  /** Users who should hear about a content item: managers/admins + its creator + its intern. */
  async getStakeholderIds(item) {
    const { rows } = await pool.query(
      `SELECT id FROM users WHERE status = 'active' AND role IN ('admin','manager')`
    );
    const ids = new Set(rows.map((r) => r.id));
    if (item.editor_id) ids.add(item.editor_id);
    if (item.poster_id) ids.add(item.poster_id);
    return [...ids];
  }
  async notifyUsers(userIds, notif, excludeUserId) {
    const targets = [...new Set(userIds)].filter((id) => id && id !== excludeUserId);
    await Promise.all(
      targets.map(
        (uid) => this.createNotification({
          user_id: uid,
          title: notif.title,
          message: notif.message,
          content_id: notif.content_id,
          type: notif.type || "general"
        })
      )
    );
  }
  async createContent(item, creator) {
    const id = newId("content");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { rows } = await pool.query(
      `INSERT INTO content_items
        (id, title, description, content_type, platform, category,
         scheduled_date, scheduled_time, editor_id, poster_id, caption, hashtags,
         instructions, status, tags, created_by, created_at, updated_at,
         reference_notes, internal_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [
        id,
        item.title,
        item.description,
        item.content_type,
        item.platform,
        item.category || "Education",
        item.scheduled_date,
        item.scheduled_time,
        item.editor_id,
        item.poster_id,
        item.caption,
        item.hashtags,
        item.instructions,
        item.status || "PLANNED",
        item.tags || [],
        creator.id,
        now,
        now,
        item.reference_notes ?? null,
        item.internal_notes ?? null
      ]
    );
    const newContent = rowToContent(rows[0]);
    await this.logActivity({
      content_id: newContent.id,
      user_id: creator.id,
      user_name: creator.name,
      user_role: creator.role,
      action: "created_content",
      description: `${creator.name} created "${newContent.title}" for ${newContent.scheduled_date} at ${newContent.scheduled_time}.`
    });
    if (newContent.editor_id && newContent.editor_id !== creator.id) {
      await this.createNotification({
        user_id: newContent.editor_id,
        title: `New task assigned: "${newContent.title}"`,
        message: `${creator.name} assigned you to create "${newContent.title}" (${newContent.content_type}) \u2014 due ${newContent.scheduled_date} at ${newContent.scheduled_time}.`,
        content_id: newContent.id,
        type: "assigned"
      });
    }
    if (newContent.poster_id && newContent.poster_id !== creator.id && newContent.poster_id !== newContent.editor_id) {
      await this.createNotification({
        user_id: newContent.poster_id,
        title: `New post scheduled: "${newContent.title}"`,
        message: `You will publish "${newContent.title}" on ${newContent.platform} \u2014 ${newContent.scheduled_date} at ${newContent.scheduled_time}.`,
        content_id: newContent.id,
        type: "assigned"
      });
    }
    return newContent;
  }
  async updateContent(id, updates, modifier, options = {}) {
    const oldItem = await this.getContentById(id);
    if (!oldItem) return null;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const allowed = [
      "title",
      "description",
      "content_type",
      "platform",
      "category",
      "scheduled_date",
      "scheduled_time",
      "editor_id",
      "poster_id",
      "caption",
      "hashtags",
      "instructions",
      "status",
      "tags",
      "video_url",
      "video_filename",
      "video_filesize",
      "video_uploaded_at",
      "video_uploaded_by",
      "thumbnail_url",
      "post_url",
      "posted_at",
      "posted_by",
      "posting_notes",
      "reference_file_url",
      "reference_notes",
      "internal_notes",
      "editor_notes"
    ];
    const sets = [];
    const vals = [];
    let i = 1;
    for (const key of allowed) {
      if (key in updates && updates[key] !== void 0) {
        sets.push(`${key} = $${i++}`);
        let v = updates[key];
        if (key === "tags") v = Array.isArray(v) ? v : [];
        vals.push(v === "" && (key === "editor_id" || key === "poster_id") ? null : v ?? null);
      }
    }
    if (sets.length === 0) return oldItem;
    sets.push(`updated_at = $${i++}`);
    vals.push(now);
    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE content_items SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      vals
    );
    const updatedItem = rows[0] ? rowToContent(rows[0]) : null;
    if (!updatedItem || options.silent) return updatedItem;
    if (updates.editor_id && updates.editor_id !== oldItem.editor_id) {
      const newEditor = await this.getUserById(updates.editor_id);
      await this.logActivity({
        content_id: id,
        user_id: modifier.id,
        user_name: modifier.name,
        user_role: modifier.role,
        action: "reassigned_creator",
        description: `${modifier.name} assigned ${newEditor?.name || "a new creator"} (${roleLabel(newEditor?.role)}) to this content.`
      });
      await this.notifyUsers([updates.editor_id], {
        title: `Task assigned to you: "${updatedItem.title}"`,
        message: `${modifier.name} assigned you to "${updatedItem.title}" \u2014 due ${updatedItem.scheduled_date}.`,
        content_id: id,
        type: "assigned"
      }, modifier.id);
    }
    if (updates.poster_id && updates.poster_id !== oldItem.poster_id) {
      const newPoster = await this.getUserById(updates.poster_id);
      await this.logActivity({
        content_id: id,
        user_id: modifier.id,
        user_name: modifier.name,
        user_role: modifier.role,
        action: "reassigned_poster",
        description: `${modifier.name} assigned ${newPoster?.name || "a new intern"} to publish this content.`
      });
      await this.notifyUsers([updates.poster_id], {
        title: `Posting task assigned to you: "${updatedItem.title}"`,
        message: `${modifier.name} assigned you to publish "${updatedItem.title}" on ${updatedItem.platform}.`,
        content_id: id,
        type: "assigned"
      }, modifier.id);
    }
    const dateChanged = updates.scheduled_date && updates.scheduled_date !== oldItem.scheduled_date;
    const timeChanged = updates.scheduled_time && updates.scheduled_time !== oldItem.scheduled_time;
    if (dateChanged || timeChanged) {
      const from = `${oldItem.scheduled_date} ${oldItem.scheduled_time}`;
      const to = `${updatedItem.scheduled_date} ${updatedItem.scheduled_time}`;
      await this.logActivity({
        content_id: id,
        user_id: modifier.id,
        user_name: modifier.name,
        user_role: modifier.role,
        action: "date_changed",
        description: `${modifier.name} moved this content from ${from} to ${to}.`,
        metadata: { from, to }
      });
      await this.notifyUsers(await this.getStakeholderIds(updatedItem), {
        title: `Rescheduled: "${updatedItem.title}"`,
        message: `${modifier.name} moved it from ${from} to ${to}.`,
        content_id: id,
        type: "general"
      }, modifier.id);
    }
    if (updates.status && updates.status !== oldItem.status) {
      await this.logActivity({
        content_id: id,
        user_id: modifier.id,
        user_name: modifier.name,
        user_role: modifier.role,
        action: "status_changed",
        description: `${modifier.name} changed status from ${STATUS_LABELS[oldItem.status]} to ${STATUS_LABELS[updates.status]}.`,
        metadata: { from: oldItem.status, to: updates.status }
      });
    }
    const otherEdits = Object.keys(updates).filter(
      (k) => ["title", "description", "content_type", "platform", "category", "caption", "hashtags", "instructions", "tags", "reference_notes", "internal_notes"].includes(k) && JSON.stringify(updates[k] ?? "") !== JSON.stringify(oldItem[k] ?? "")
    );
    if (otherEdits.length > 0) {
      const pretty = otherEdits.map((k) => k.replace(/_/g, " ")).join(", ");
      await this.logActivity({
        content_id: id,
        user_id: modifier.id,
        user_name: modifier.name,
        user_role: modifier.role,
        action: "edited_content",
        description: `${modifier.name} updated ${pretty}.`
      });
    }
    if ("editor_notes" in updates && (updates.editor_notes ?? "") !== (oldItem.editor_notes ?? "")) {
      await this.logActivity({
        content_id: id,
        user_id: modifier.id,
        user_name: modifier.name,
        user_role: modifier.role,
        action: "editor_notes",
        description: `${modifier.name} updated the creator notes.`
      });
    }
    return updatedItem;
  }
  async duplicateContent(id, user) {
    const source = await this.getContentById(id);
    if (!source) return null;
    const newId2 = newId("content");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { rows } = await pool.query(
      `INSERT INTO content_items
        (id, title, description, content_type, platform, category,
         scheduled_date, scheduled_time, editor_id, poster_id, caption, hashtags,
         instructions, status, tags, created_by, created_at, updated_at,
         reference_notes, internal_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [
        newId2,
        `${source.title} (Copy)`,
        source.description,
        source.content_type,
        source.platform,
        source.category || "Education",
        source.scheduled_date,
        source.scheduled_time,
        source.editor_id,
        source.poster_id,
        source.caption,
        source.hashtags,
        source.instructions,
        "PLANNED",
        source.tags || [],
        user.id,
        now,
        now,
        source.reference_notes ?? null,
        source.internal_notes ?? null
      ]
    );
    const duplicate = rowToContent(rows[0]);
    await this.logActivity({
      content_id: duplicate.id,
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      action: "duplicated_content",
      description: `${user.name} duplicated "${source.title}".`
    });
    return duplicate;
  }
  async deleteContent(id, user) {
    const item = await this.getContentById(id);
    if (!item) return false;
    await pool.query("DELETE FROM content_items WHERE id = $1", [id]);
    await this.logActivity({
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      action: "deleted_content",
      description: `${user.name} deleted content "${item.title}".`
    });
    return true;
  }
  // ------------------------------------------------------------------
  // Final asset upload — stores only metadata (path/filename/size), NOT the binary
  // ------------------------------------------------------------------
  async uploadVideoForContent(contentId, videoData, uploader) {
    const item = await this.getContentById(contentId);
    if (!item) return null;
    const isReplacement = Boolean(item.video_url);
    const nextStatus = item.status === "POSTED" ? "POSTED" : "READY_TO_POST";
    const updatedItem = await this.updateContent(
      contentId,
      {
        video_url: videoData.video_url,
        video_filename: videoData.video_filename,
        video_filesize: videoData.video_filesize,
        video_uploaded_at: (/* @__PURE__ */ new Date()).toISOString(),
        video_uploaded_by: uploader.id,
        status: nextStatus
      },
      uploader
    );
    if (updatedItem) {
      await this.logActivity({
        content_id: contentId,
        user_id: uploader.id,
        user_name: uploader.name,
        user_role: uploader.role,
        action: isReplacement ? "replaced_final_video" : "uploaded_final_video",
        description: `${uploader.name} ${isReplacement ? "replaced the final file with" : "uploaded"} ${videoData.video_filename}.`,
        metadata: videoData
      });
      if (nextStatus === "READY_TO_POST") {
        await this.notifyUsers(await this.getStakeholderIds(item), {
          title: `Ready to post: "${item.title}"`,
          message: `${uploader.name} uploaded the final file for "${item.title}". It is ready to publish on ${item.platform} (${item.scheduled_date} at ${item.scheduled_time}).`,
          content_id: item.id,
          type: "ready_to_post"
        }, uploader.id);
      }
    }
    return updatedItem;
  }
  // ------------------------------------------------------------------
  // Mark as posted (atomic — a POSTED item can never be posted twice)
  // ------------------------------------------------------------------
  async markContentAsPosted(contentId, postingData, poster) {
    const item = await this.getContentById(contentId);
    if (!item) return { item: null, alreadyPosted: false };
    const postedAt = postingData.posted_at && !isNaN(Date.parse(postingData.posted_at)) ? new Date(postingData.posted_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
    const { rows } = await pool.query(
      `UPDATE content_items
         SET status = 'POSTED', posted_by = $1, posted_at = $2, post_url = $3,
             posting_notes = $4, platform = COALESCE(NULLIF($5, ''), platform), updated_at = NOW()
       WHERE id = $6 AND status <> 'POSTED'
       RETURNING *`,
      [poster.id, postedAt, postingData.post_url || null, postingData.posting_notes || null, postingData.platform || "", contentId]
    );
    if (!rows[0]) return { item: await this.getContentById(contentId) ?? null, alreadyPosted: true };
    const updated = rowToContent(rows[0]);
    await this.logActivity({
      content_id: contentId,
      user_id: poster.id,
      user_name: poster.name,
      user_role: poster.role,
      action: "marked_posted",
      description: `${poster.name} marked "${item.title}" as Posted on ${updated.platform}.`,
      metadata: { from: item.status, to: "POSTED" }
    });
    if (postingData.post_url) {
      await this.logActivity({
        content_id: contentId,
        user_id: poster.id,
        user_name: poster.name,
        user_role: poster.role,
        action: "added_post_url",
        description: `${poster.name} added the post link: ${postingData.post_url}`
      });
    }
    await this.notifyUsers(await this.getStakeholderIds(item), {
      title: `Posted: "${item.title}"`,
      message: `${poster.name} published "${item.title}" on ${updated.platform}.`,
      content_id: item.id,
      type: "posted"
    }, poster.id);
    return { item: updated, alreadyPosted: false };
  }
  // ------------------------------------------------------------------
  // Revision
  // ------------------------------------------------------------------
  async requestRevision(contentId, notes, requester) {
    const item = await this.getContentById(contentId);
    if (!item) return null;
    const updated = await this.updateContent(
      contentId,
      { status: "REVISION", internal_notes: notes },
      requester,
      { silent: true }
    );
    if (updated) {
      await this.logActivity({
        content_id: contentId,
        user_id: requester.id,
        user_name: requester.name,
        user_role: requester.role,
        action: "revision_requested",
        description: `${requester.name} sent this back for revision: "${notes}"`,
        metadata: { from: item.status, to: "REVISION" }
      });
      await this.notifyUsers([item.editor_id], {
        title: `Revision requested: "${item.title}"`,
        message: `${requester.name}: "${notes}"`,
        content_id: item.id,
        type: "revision"
      }, requester.id);
    }
    return updated;
  }
  // ------------------------------------------------------------------
  // Issues
  // ------------------------------------------------------------------
  async reportIssue(issueData, reporter) {
    const content = await this.getContentById(issueData.content_id);
    const id = newId("issue");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { rows } = await pool.query(
      `INSERT INTO issues (id, content_id, content_title, reported_by, reporter_name, issue_type, description, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'OPEN',$8) RETURNING *`,
      [
        id,
        issueData.content_id,
        content?.title || "Unknown Content",
        reporter.id,
        reporter.name,
        issueData.issue_type,
        issueData.description,
        now
      ]
    );
    const newIssue = rowToIssue(rows[0]);
    const typeLabel = String(issueData.issue_type).replace(/_/g, " ");
    if (content && content.status !== "POSTED") {
      await this.updateContent(issueData.content_id, { status: "ISSUE" }, reporter, { silent: true });
    }
    await this.logActivity({
      content_id: issueData.content_id,
      user_id: reporter.id,
      user_name: reporter.name,
      user_role: reporter.role,
      action: "reported_issue",
      description: `${reporter.name} reported an issue (${typeLabel})${issueData.description ? `: ${issueData.description}` : "."}`
    });
    if (content) {
      const { rows: mgrs } = await pool.query(
        `SELECT id FROM users WHERE status = 'active' AND role IN ('admin','manager')`
      );
      await this.notifyUsers([...mgrs.map((r) => r.id), content.editor_id], {
        title: `Issue reported: "${content.title}"`,
        message: `${reporter.name} reported "${typeLabel}"${issueData.description ? `: ${issueData.description}` : "."}`,
        content_id: issueData.content_id,
        type: "issue"
      }, reporter.id);
    }
    return newIssue;
  }
  async getIssueById(issueId) {
    const { rows } = await pool.query("SELECT * FROM issues WHERE id = $1", [issueId]);
    return rows[0] ? rowToIssue(rows[0]) : void 0;
  }
  async resolveIssue(issueId, resolver) {
    const existing = await this.getIssueById(issueId);
    if (!existing) return null;
    const { rows } = await pool.query(
      `UPDATE issues SET status='RESOLVED', resolved_by=$1, resolved_at=NOW() WHERE id=$2 RETURNING *`,
      [resolver.id, issueId]
    );
    const issue = rowToIssue(rows[0]);
    const content = await this.getContentById(issue.content_id);
    if (content && content.status === "ISSUE") {
      const { rows: open } = await pool.query(
        `SELECT 1 FROM issues WHERE content_id = $1 AND status = 'OPEN' LIMIT 1`,
        [content.id]
      );
      if (open.length === 0) {
        const nextStatus = content.video_url ? "READY_TO_POST" : "EDITING";
        await this.updateContent(content.id, { status: nextStatus }, resolver);
      }
    }
    await this.logActivity({
      content_id: issue.content_id,
      user_id: resolver.id,
      user_name: resolver.name,
      user_role: resolver.role,
      action: "resolved_issue",
      description: `${resolver.name} resolved the "${issue.issue_type.replace(/_/g, " ")}" issue.`
    });
    if (content) {
      await this.notifyUsers([existing.reported_by, content.editor_id, content.poster_id], {
        title: `Issue resolved: "${issue.content_title || content.title}"`,
        message: `${resolver.name} marked the reported issue as resolved.`,
        content_id: issue.content_id,
        type: "general"
      }, resolver.id);
    }
    return issue;
  }
  async getIssues(contentId, visibleTo) {
    const conditions = [];
    const vals = [];
    let i = 1;
    if (contentId) {
      conditions.push(`i.content_id = $${i++}`);
      vals.push(contentId);
    }
    const vis = visibilityClause(visibleTo, i, "c");
    if (vis.sql) {
      conditions.push(vis.sql);
      vals.push(...vis.vals);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT i.* FROM issues i JOIN content_items c ON c.id = i.content_id ${where} ORDER BY i.created_at DESC`,
      vals
    );
    return rows.map(rowToIssue);
  }
  // ------------------------------------------------------------------
  // Activity Logs
  // ------------------------------------------------------------------
  async logActivity(log) {
    const id = newId("log");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { rows } = await pool.query(
      `INSERT INTO activity_logs (id, content_id, user_id, user_name, user_role, action, description, metadata, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        id,
        log.content_id ?? null,
        log.user_id,
        log.user_name ?? null,
        log.user_role ?? null,
        log.action,
        log.description,
        log.metadata ? JSON.stringify(log.metadata) : null,
        now
      ]
    );
    return rowToLog(rows[0]);
  }
  async getActivityLogs(contentId, limit = 50, visibleTo, since) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 500));
    const conditions = [];
    const vals = [];
    let i = 1;
    if (since && !Number.isNaN(Date.parse(since))) {
      conditions.push(`l.created_at > $${i++}`);
      vals.push(new Date(since).toISOString());
    }
    if (contentId) {
      conditions.push(`l.content_id = $${i++}`);
      vals.push(contentId);
    }
    if (visibleTo && !isManagerial(visibleTo.role)) {
      conditions.push(`(c.editor_id = $${i} OR c.poster_id = $${i})`);
      vals.push(visibleTo.id);
      i++;
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    vals.push(safeLimit);
    const { rows } = await pool.query(
      `SELECT l.* FROM activity_logs l LEFT JOIN content_items c ON c.id = l.content_id
       ${where} ORDER BY l.created_at DESC LIMIT $${i}`,
      vals
    );
    return rows.map(rowToLog);
  }
  // ------------------------------------------------------------------
  // Notifications
  // ------------------------------------------------------------------
  async createNotification(notif) {
    const id = newId("notif");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { rows } = await pool.query(
      `INSERT INTO notifications (id, user_id, title, message, content_id, read, type, created_at)
       VALUES ($1,$2,$3,$4,$5,FALSE,$6,$7) RETURNING *`,
      [id, notif.user_id, notif.title, notif.message, notif.content_id ?? null, notif.type || "general", now]
    );
    const created = rowToNotif(rows[0]);
    if (TASK_EMAIL_TYPES.has(created.type || "general") && emailConfigured()) {
      this.emailTaskNotification(created).catch(
        (err) => console.warn(`\u26A0\uFE0F  Task e-mail skipped: ${err.message}`)
      );
    }
    return created;
  }
  /** Sends the task e-mail for a notification: new task, revision, or a file ready for them to post. */
  async emailTaskNotification(n) {
    const { rows: s } = await pool.query("SELECT notification_email FROM settings ORDER BY id LIMIT 1");
    if (s[0] && s[0].notification_email === false) return;
    const user = await this.getUserById(n.user_id);
    if (!user || user.status !== "active" || !user.email) return;
    const item = n.content_id ? await this.getContentById(n.content_id) : void 0;
    if (n.type === "ready_to_post" && item?.poster_id !== user.id) return;
    const cap = (v) => v ? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ") : "";
    const when = (date, t) => {
      if (!date) return "";
      const [y, m, d] = date.split("-").map(Number);
      const [hh, mm] = (t || "00:00").split(":").map(Number);
      const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0));
      const day = dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
      return t ? `${day}, ${dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })}` : day;
    };
    const nameOf = async (id) => id ? (await this.getUserById(id))?.name || "" : "";
    const kind = n.type;
    const details = item ? [
      ["Content type", cap(item.content_type)],
      ["Platform", cap(item.platform)],
      ["Scheduled for", when(item.scheduled_date, item.scheduled_time)],
      ["Designer / Editor", await nameOf(item.editor_id)],
      ["Publishing (Intern)", await nameOf(item.poster_id)]
    ] : [];
    const TYPE_WORDS = {
      reel: "reel",
      short: "short video",
      carousel: "carousel",
      static: "static post",
      story: "story",
      thread: "thread",
      announcement: "announcement",
      other: "content piece"
    };
    const typeName = TYPE_WORDS[item?.content_type || ""] || "content piece";
    const assignedBy = n.message.includes(" assigned you") ? n.message.split(" assigned you")[0] : "";
    if (assignedBy && kind === "assigned") details.unshift(["Assigned by", assignedBy]);
    let message = n.message;
    let note;
    if (kind === "assigned" && item) {
      message = item.poster_id === user.id && item.editor_id !== user.id ? item.status === "READY_TO_POST" ? `You have been assigned to publish this ${typeName} on ${cap(item.platform)}. The final file is already ready \u2014 please download it, publish it at the scheduled time and mark it as posted.` : `You have been assigned to publish this ${typeName} on ${cap(item.platform)}. You will be notified again when the final file is ready. The details are below.` : `You have been assigned to create this ${typeName}. Please review the details below and upload the final file before the scheduled time.`;
      if (item.instructions) note = { label: "Instructions", text: item.instructions };
    } else if (kind === "revision") {
      message = "Changes have been requested on this content. Please review the notes below and upload an updated file.";
      note = { label: "Revision notes", text: n.message };
    } else if (kind === "ready_to_post") {
      message = `The final file is ready. Please download it, publish it on ${cap(item?.platform)} at the scheduled time, and then mark it as posted with the post link.`;
      if (item?.caption) note = { label: "Caption", text: [item.caption, item.hashtags].filter(Boolean).join("\n\n") };
    }
    sendTaskEmail({
      to: user.email,
      toName: user.name,
      kind,
      subject: n.title,
      heading: item?.title,
      message,
      details,
      note
    });
  }
  /**
   * Pop-ups this person missed while ContentOps was closed (oldest first, at most 50), and
   * marks them as shown. Admins: everything the team did. Everyone else: their notifications.
   */
  async takeMissedPopups(user) {
    const { rows: t } = await pool.query("SELECT NOW() AS now, popups_seen_at FROM users WHERE id = $1", [user.id]);
    if (!t[0]) return { now: (/* @__PURE__ */ new Date()).toISOString(), items: [] };
    const now = t[0].now;
    const seen = t[0].popups_seen_at ?? null;
    let items = [];
    if (user.role === "admin") {
      if (seen) {
        const { rows } = await pool.query(
          `SELECT * FROM (
             SELECT * FROM activity_logs
              WHERE created_at > $1 AND created_at <= $2 AND user_id <> $3 AND action <> 'storage_cleanup'
              ORDER BY created_at DESC LIMIT 50
           ) x ORDER BY created_at ASC`,
          [seen, now, user.id]
        );
        items = rows.map((r) => ({
          id: `activity-${r.id}`,
          title: ACTIVITY_TITLES[r.action] || "New activity",
          message: r.description,
          type: activityPopupType(r.action),
          content_id: r.content_id ?? null,
          created_at: iso(r.created_at)
        }));
      }
    } else {
      const { rows } = await pool.query(
        `SELECT * FROM (
           SELECT * FROM notifications
            WHERE user_id = $1 AND created_at <= $2 AND ${seen ? "created_at > $3" : "read = FALSE"}
            ORDER BY created_at DESC LIMIT 50
         ) x ORDER BY created_at ASC`,
        seen ? [user.id, now, seen] : [user.id, now]
      );
      items = rows.map((r) => {
        const n = rowToNotif(r);
        return { id: n.id, title: n.title, message: n.message, type: n.type || "general", content_id: n.content_id ?? null, created_at: n.created_at };
      });
    }
    await pool.query("UPDATE users SET popups_seen_at = $2 WHERE id = $1", [user.id, now]);
    return { now: iso(now), items };
  }
  /** The app showed this pop-up live — don't show it again next time ContentOps is opened. */
  async markPopupSeen(userId, kind, id) {
    const table = kind === "activity" ? "activity_logs" : "notifications";
    await pool.query(
      `UPDATE users SET popups_seen_at = GREATEST(COALESCE(popups_seen_at, 'epoch'::timestamptz), x.created_at)
         FROM (SELECT created_at FROM ${table} WHERE id = $2) x
        WHERE users.id = $1`,
      [userId, id]
    );
  }
  async getNotifications(userId) {
    const { rows } = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100",
      [userId]
    );
    return rows.map(rowToNotif);
  }
  async markNotificationAsRead(id, userId) {
    const { rowCount } = await pool.query(
      "UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }
  async markAllNotificationsAsRead(userId) {
    await pool.query("UPDATE notifications SET read = TRUE WHERE user_id = $1", [userId]);
  }
  // ------------------------------------------------------------------
  // Settings
  // ------------------------------------------------------------------
  async getSettings() {
    const { rows } = await pool.query("SELECT * FROM settings ORDER BY id LIMIT 1");
    if (!rows[0]) {
      return {
        workspace_name: "ContentFlow",
        default_timezone: "Asia/Kolkata",
        default_platform: "instagram",
        allow_editor_replace: true,
        notification_email: true
      };
    }
    return rowToSettings(rows[0]);
  }
  async updateSettings(settings) {
    const { rows: existing } = await pool.query("SELECT id FROM settings ORDER BY id LIMIT 1");
    const id = existing[0]?.id;
    if (!id) {
      const { rows: rows2 } = await pool.query(
        `INSERT INTO settings (workspace_name, default_timezone, default_platform, allow_editor_replace, notification_email)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [
          settings.workspace_name || "ContentFlow",
          settings.default_timezone || "Asia/Kolkata",
          settings.default_platform || "instagram",
          settings.allow_editor_replace ?? true,
          settings.notification_email ?? true
        ]
      );
      return rowToSettings(rows2[0]);
    }
    const sets = [];
    const vals = [];
    let i = 1;
    const allowed = [
      "workspace_name",
      "default_timezone",
      "default_platform",
      "allow_editor_replace",
      "notification_email",
      "auto_cleanup_enabled",
      "retention_days"
    ];
    for (const key of allowed) {
      if (key in settings && settings[key] !== void 0) {
        sets.push(`${key} = $${i++}`);
        vals.push(settings[key]);
      }
    }
    if (sets.length === 0) return this.getSettings();
    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE settings SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      vals
    );
    return rowToSettings(rows[0]);
  }
  // ------------------------------------------------------------------
  // Metrics (scoped to what the viewer can see; "today" uses the workspace timezone)
  // ------------------------------------------------------------------
  async getOperationalMetrics(viewer) {
    const settings = await this.getSettings();
    const { date: referenceDate, time: referenceTime } = nowInTimezone(settings.default_timezone);
    const vis = visibilityClause(viewer, 1);
    const { rows } = await pool.query(
      `SELECT status, scheduled_date, scheduled_time FROM content_items ${vis.sql ? `WHERE ${vis.sql}` : ""}`,
      vis.vals
    );
    let planned = 0, editing = 0, ready_to_post = 0, posted = 0, revision = 0, issue = 0;
    let overdue_editing = 0, overdue_posting = 0, today_count = 0;
    for (const row of rows) {
      const sd = String(row.scheduled_date).slice(0, 10);
      const st = String(row.scheduled_time).slice(0, 5);
      const status = row.status;
      if (status === "PLANNED") planned++;
      else if (status === "EDITING") editing++;
      else if (status === "READY_TO_POST") ready_to_post++;
      else if (status === "POSTED") posted++;
      else if (status === "REVISION") revision++;
      else if (status === "ISSUE") issue++;
      if (sd === referenceDate) today_count++;
      if ((status === "EDITING" || status === "PLANNED") && sd < referenceDate) overdue_editing++;
      if (status === "READY_TO_POST" && (sd < referenceDate || sd === referenceDate && st < referenceTime)) {
        overdue_posting++;
      }
    }
    return {
      total: rows.length,
      planned,
      editing,
      ready_to_post,
      posted,
      revision,
      issue,
      overdue_editing,
      overdue_posting,
      today_count
    };
  }
  // ------------------------------------------------------------------
  // Init — create/migrate schema and seed the team roster
  // ------------------------------------------------------------------
  async init() {
    await ensureDatabaseExists();
    const client2 = await pool.connect();
    try {
      const statements = SCHEMA_SQL.split(/;\s*\n/).map((x) => x.trim()).filter(Boolean);
      let schemaDone = false;
      try {
        await client2.query(statements.join(";\n") + ";");
        schemaDone = true;
      } catch {
        schemaDone = false;
      }
      for (const stmt of schemaDone ? [] : statements) {
        try {
          await client2.query(stmt);
        } catch (err) {
          if (/^CREATE (UNIQUE )?INDEX/i.test(stmt)) {
            console.warn(`\u26A0\uFE0F  Skipped index (${err.message}): ${stmt.slice(0, 80)}`);
          } else {
            throw err;
          }
        }
      }
      await client2.query(
        `UPDATE settings SET vault_key = $1 WHERE id = (SELECT MIN(id) FROM settings) AND vault_key IS NULL`,
        [newVaultKeyHex()]
      );
      const { rows: vk } = await client2.query("SELECT vault_key FROM settings WHERE vault_key IS NOT NULL ORDER BY id LIMIT 1");
      if (vk[0]?.vault_key) setSharedVaultKey(vk[0].vault_key);
      console.log(envVaultKey() ? "\u{1F510} Password key: PASSWORD_VAULT_KEY (database key also accepted for reading)" : "\u{1F510} Password key: stored in the database (same for every server and redeploy)");
      await initPush(pool);
      if (!isLocalDatabase(DATABASE_URL)) {
        for (const t of ["workspaces", "users", "content_items", "activity_logs", "issues", "notifications", "settings", "sessions", "push_subscriptions"]) {
          try {
            await client2.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
          } catch (err) {
            console.warn(`\u26A0\uFE0F  Could not enable row level security on ${t}: ${err.message}`);
          }
        }
      }
      const teamPassword = process.env.TEAM_DEFAULT_PASSWORD || "Quickupp@123";
      const setPassword = async (userId, plain, _unused) => {
        await client2.query(
          `UPDATE users SET password_hash = $1, password_enc = $2, must_change_password = FALSE, updated_at = NOW() WHERE id = $3`,
          [await import_bcryptjs.default.hash(plain, 10), encryptPassword(plain), userId]
        );
      };
      await client2.query("UPDATE users SET must_change_password = FALSE WHERE must_change_password = TRUE");
      await client2.query(`DELETE FROM users WHERE role NOT IN ('admin','manager','graphic_designer','editor','poster')`);
      const { rows: [{ n: userCount }] } = await client2.query("SELECT COUNT(*)::int AS n FROM users");
      let carriedOver = false;
      if (userCount === 0) {
        const previousUrl = (process.env.PREVIOUS_DATABASE_URL || "").trim();
        if (previousUrl && previousUrl !== DATABASE_URL) {
          let copied;
          try {
            copied = await copyFromPreviousDatabase(client2, previousUrl);
          } catch (err) {
            throw new Error(
              `Could not copy data from PREVIOUS_DATABASE_URL (${err.message}). Fix that link or remove it from .env, then start again. Nothing was changed and no default passwords were set.`
            );
          }
          if (copied) {
            carriedOver = true;
            console.log(`\u2705 Copied everything from the previous database \u2014 ${Object.entries(copied).map(([t, n]) => `${t}: ${n}`).join(", ")}`);
          } else {
            console.warn("\u26A0\uFE0F  PREVIOUS_DATABASE_URL has no accounts \u2014 nothing copied from it.");
          }
        }
        if (!carriedOver) {
          const restored = await restoreAccountsBackup(client2);
          if (restored > 0) {
            carriedOver = true;
            console.log(`\u2705 Restored ${restored} account(s) with their current passwords from data/accounts-backup.json`);
          }
        }
      }
      if (userCount === 0 && !carriedOver) {
        for (const member of TEAM_ROSTER) {
          const id = newId("user");
          await client2.query(
            `INSERT INTO users (id, name, email, password_hash, avatar, role, status)
             VALUES ($1, $2, $3, '', '', $4, 'active')`,
            [id, member.name, member.email.trim().toLowerCase(), member.role]
          );
          await setPassword(id, teamPassword, true);
          console.log(`\u2705 Added ${member.name} (${member.email.trim().toLowerCase()})`);
        }
      } else {
        const { rows: noPw } = await client2.query(`SELECT id FROM users WHERE password_hash = ''`);
        for (const r of noPw) await setPassword(r.id, teamPassword, true);
      }
      for (const member of TEAM_ROSTER) {
        if (!member.whatsapp) continue;
        await client2.query(
          `UPDATE users SET whatsapp = $2 WHERE email = $1 AND COALESCE(whatsapp, '') = ''`,
          [member.email.trim().toLowerCase(), member.whatsapp]
        );
      }
      const CREDENTIALS_VERSION = 3;
      await client2.query("UPDATE settings SET credentials_version = $1 WHERE credentials_version < $1", [CREDENTIALS_VERSION]);
      console.log(`\u{1F510} Admin sign-in accounts configured`);
      await client2.query("DELETE FROM sessions WHERE expires_at < NOW()");
      await saveAccountsBackup(client2);
    } finally {
      client2.release();
    }
    console.log("\u2705 PostgreSQL connected \u2014 schema ready");
  }
};
var db = new RelationalDatabase();

// server/sampleData.ts
var SAMPLE_CALENDAR_ITEMS = [
  {
    title: "Behind-the-scenes workflow",
    description: "Take followers behind the scenes to observe raw production and setup workflow.",
    content_type: "reel",
    platform: "instagram",
    category: "Education",
    scheduled_date: "2026-01-30",
    scheduled_time: "18:00",
    status: "ISSUE",
    caption: "Ever wonder what goes on before we hit record? Here is our workflow!",
    hashtags: "#behindthescenes #workflow #reels",
    instructions: "Post to feed and reels with custom cover frame."
  },
  {
    title: "Behind-the-scenes workflow",
    description: "Take followers behind the scenes to observe raw production and setup workflow.",
    content_type: "reel",
    platform: "instagram",
    category: "Education",
    scheduled_date: "2026-09-02",
    scheduled_time: "18:00",
    status: "ISSUE",
    caption: "Ever wonder what goes on before we hit record? Here is our workflow!",
    hashtags: "#behindthescenes #workflow #reels",
    instructions: "Post to feed and reels with custom cover frame."
  },
  {
    title: "Poll on next template",
    description: "Interactive story poll asking users which template colorway they want next.",
    content_type: "story",
    platform: "instagram",
    category: "Engagement",
    scheduled_date: "2026-01-01",
    scheduled_time: "14:00",
    status: "POSTED",
    caption: "Vote now in our stories!",
    hashtags: "#poll #interactive",
    instructions: "Add poll sticker: Option A vs Option B."
  },
  {
    title: "Poll on next template",
    description: "Interactive story poll asking users which template colorway they want next.",
    content_type: "story",
    platform: "instagram",
    category: "Engagement",
    scheduled_date: "2026-09-04",
    scheduled_time: "14:00",
    status: "POSTED",
    caption: "Vote now in our stories!",
    hashtags: "#poll #interactive",
    instructions: "Add poll sticker: Option A vs Option B."
  },
  {
    title: "Promo reminder",
    description: "Announcement reminding subscribers of registration cutoff.",
    content_type: "announcement",
    platform: "instagram",
    category: "Promo",
    scheduled_date: "2026-01-03",
    scheduled_time: "19:30",
    status: "READY_TO_POST",
    caption: "Last chance for 30% off early bird perks. Link in bio!",
    hashtags: "#promo #limitedoffer",
    instructions: "Pin to profile highlights and broadcast channel."
  },
  {
    title: "Promo reminder",
    description: "Announcement reminding subscribers of registration cutoff.",
    content_type: "announcement",
    platform: "instagram",
    category: "Promo",
    scheduled_date: "2026-09-08",
    scheduled_time: "19:30",
    status: "READY_TO_POST",
    caption: "Last chance for 30% off early bird perks. Link in bio!",
    hashtags: "#promo #limitedoffer",
    instructions: "Pin to profile highlights and broadcast channel."
  },
  {
    title: "15s setup hack",
    description: "Quick educational micro-reel showing smart camera positioning trick.",
    content_type: "reel",
    platform: "instagram",
    category: "Education",
    scheduled_date: "2026-01-06",
    scheduled_time: "17:00",
    status: "EDITING",
    caption: "Save this 15s hack for your next shoot.",
    hashtags: "#setuphack #tips #production",
    instructions: "High pacing, sound effects on text pops."
  },
  {
    title: "15s setup hack",
    description: "Quick educational micro-reel showing smart camera positioning trick.",
    content_type: "reel",
    platform: "instagram",
    category: "Education",
    scheduled_date: "2026-09-10",
    scheduled_time: "17:00",
    status: "EDITING",
    caption: "Save this 15s hack for your next shoot.",
    hashtags: "#setuphack #tips #production",
    instructions: "High pacing, sound effects on text pops."
  },
  {
    title: "Creator workflow myth-busting",
    description: "Deep dive text thread debunking viral equipment myths.",
    content_type: "thread",
    platform: "instagram",
    category: "Education",
    scheduled_date: "2026-01-08",
    scheduled_time: "12:00",
    status: "REVISION",
    caption: "Stop buying gear you do not need! Read the breakdown \u{1F9F5}\u{1F447}",
    hashtags: "#threads #creators #mythbusting",
    instructions: "Cross-post to Instagram Threads and carousel slides."
  },
  {
    title: "Creator workflow myth-busting",
    description: "Deep dive text thread debunking viral equipment myths.",
    content_type: "thread",
    platform: "instagram",
    category: "Education",
    scheduled_date: "2026-09-14",
    scheduled_time: "12:00",
    status: "REVISION",
    caption: "Stop buying gear you do not need! Read the breakdown \u{1F9F5}\u{1F447}",
    hashtags: "#threads #creators #mythbusting",
    instructions: "Cross-post to Instagram Threads and carousel slides."
  },
  {
    title: "New template drop",
    description: "Showcase announcement presenting new responsive grid templates.",
    content_type: "announcement",
    platform: "instagram",
    category: "Promo",
    scheduled_date: "2026-01-09",
    scheduled_time: "18:30",
    status: "READY_TO_POST",
    caption: "Brand new layouts just dropped inside the template library.",
    hashtags: "#templatedrop #newrelease #design",
    instructions: "Include swipe-up link sticker in associated story."
  },
  {
    title: "New template drop",
    description: "Showcase announcement presenting new responsive grid templates.",
    content_type: "announcement",
    platform: "instagram",
    category: "Promo",
    scheduled_date: "2026-09-16",
    scheduled_time: "18:30",
    status: "READY_TO_POST",
    caption: "Brand new layouts just dropped inside the template library.",
    hashtags: "#templatedrop #newrelease #design",
    instructions: "Include swipe-up link sticker in associated story."
  },
  {
    title: "Checkout link + CTA",
    description: "Direct response story sequence guiding warm leads to order checkout.",
    content_type: "story",
    platform: "instagram",
    category: "Promo",
    scheduled_date: "2026-01-11",
    scheduled_time: "16:00",
    status: "POSTED",
    caption: "Tap the link to lock in bonuses before midnight.",
    hashtags: "#linkinbio #limitedperks",
    instructions: "Link sticker pointing directly to cart checkout."
  },
  {
    title: "Checkout link + CTA",
    description: "Direct response story sequence guiding warm leads to order checkout.",
    content_type: "story",
    platform: "instagram",
    category: "Promo",
    scheduled_date: "2026-09-19",
    scheduled_time: "16:00",
    status: "POSTED",
    caption: "Tap the link to lock in bonuses before midnight.",
    hashtags: "#linkinbio #limitedperks",
    instructions: "Link sticker pointing directly to cart checkout."
  },
  {
    title: "Customer highlights",
    description: "Multi-slide carousel reviewing real user transformations and quote callouts.",
    content_type: "carousel",
    platform: "instagram",
    category: "Engagement",
    scheduled_date: "2026-01-12",
    scheduled_time: "15:00",
    status: "EDITING",
    caption: "See what our community achieved this past month! Swipe through \u27A1\uFE0F",
    hashtags: "#communitylove #casestudy #success",
    instructions: "Slide 1 hook graphic, slide 2-5 user stats, slide 6 comment prompt."
  },
  {
    title: "Customer highlights",
    description: "Multi-slide carousel reviewing real user transformations and quote callouts.",
    content_type: "carousel",
    platform: "instagram",
    category: "Engagement",
    scheduled_date: "2026-09-21",
    scheduled_time: "15:00",
    status: "EDITING",
    caption: "See what our community achieved this past month! Swipe through \u27A1\uFE0F",
    hashtags: "#communitylove #casestudy #success",
    instructions: "Slide 1 hook graphic, slide 2-5 user stats, slide 6 comment prompt."
  },
  {
    title: "Q&A box",
    description: "Weekly AMA story box addressing audience content workflow questions.",
    content_type: "story",
    platform: "instagram",
    category: "Engagement",
    scheduled_date: "2026-01-14",
    scheduled_time: "11:00",
    status: "READY_TO_POST",
    caption: "Drop your burning video editing questions below!",
    hashtags: "#askmeanything #storyqna",
    instructions: "Question box sticker with prompt text."
  },
  {
    title: "Q&A box",
    description: "Weekly AMA story box addressing audience content workflow questions.",
    content_type: "story",
    platform: "instagram",
    category: "Engagement",
    scheduled_date: "2026-09-23",
    scheduled_time: "11:00",
    status: "READY_TO_POST",
    caption: "Drop your burning video editing questions below!",
    hashtags: "#askmeanything #storyqna",
    instructions: "Question box sticker with prompt text."
  },
  {
    title: "Before-after demo",
    description: "Color grading and sound design before vs after comparison reel.",
    content_type: "reel",
    platform: "instagram",
    category: "Education",
    scheduled_date: "2026-01-20",
    scheduled_time: "18:00",
    status: "REVISION",
    caption: "Audio is 50% of your video. Listen with headphones \u{1F3A7}",
    hashtags: "#colorgrading #sounddesign #cinematic",
    instructions: "Split screen wipe at second 0:04."
  },
  {
    title: "Before-after demo",
    description: "Color grading and sound design before vs after comparison reel.",
    content_type: "reel",
    platform: "instagram",
    category: "Education",
    scheduled_date: "2026-09-25",
    scheduled_time: "18:00",
    status: "REVISION",
    caption: "Audio is 50% of your video. Listen with headphones \u{1F3A7}",
    hashtags: "#colorgrading #sounddesign #cinematic",
    instructions: "Split screen wipe at second 0:04."
  },
  {
    title: "Localization tips",
    description: "Thread breaking down best practices for caption translations and global reach.",
    content_type: "thread",
    platform: "instagram",
    category: "Education",
    scheduled_date: "2026-01-22",
    scheduled_time: "13:00",
    status: "PLANNED",
    caption: "Why English-only content limits your potential view count by 60%.",
    hashtags: "#localization #globalreach #threads",
    instructions: "Draft ready for final manager approval."
  },
  {
    title: "Localization tips",
    description: "Thread breaking down best practices for caption translations and global reach.",
    content_type: "thread",
    platform: "instagram",
    category: "Education",
    scheduled_date: "2026-09-27",
    scheduled_time: "13:00",
    status: "PLANNED",
    caption: "Why English-only content limits your potential view count by 60%.",
    hashtags: "#localization #globalreach #threads",
    instructions: "Draft ready for final manager approval."
  },
  {
    title: "Feature spotlight",
    description: "Step-by-step visual carousel explaining the top 3 shortcuts creators overlook.",
    content_type: "carousel",
    platform: "instagram",
    category: "Education",
    scheduled_date: "2026-01-24",
    scheduled_time: "17:30",
    status: "READY_TO_POST",
    caption: "These 3 keyboard shortcuts will save you 2 hours every week.",
    hashtags: "#productivity #shortcuts #editinghacks",
    instructions: "High contrast carousel with bold slide numbers."
  },
  {
    title: "Feature spotlight",
    description: "Step-by-step visual carousel explaining the top 3 shortcuts creators overlook.",
    content_type: "carousel",
    platform: "instagram",
    category: "Education",
    scheduled_date: "2026-09-29",
    scheduled_time: "17:30",
    status: "READY_TO_POST",
    caption: "These 3 keyboard shortcuts will save you 2 hours every week.",
    hashtags: "#productivity #shortcuts #editinghacks",
    instructions: "High contrast carousel with bold slide numbers."
  }
];

// server/storageCleanup.ts
var import_fs6 = __toESM(require("fs"), 1);
var import_path4 = __toESM(require("path"), 1);

// server/fileStore.ts
var import_fs5 = __toESM(require("fs"), 1);
var import_client_s3 = require("@aws-sdk/client-s3");
var import_s3_request_presigner = require("@aws-sdk/s3-request-presigner");
var PREFIX = "uploads/";
var DEFAULT_ACCOUNT_ID = "314b20b9b41e428050dbadd176edade4";
var DEFAULT_BUCKET = "quickuppcms-uploads";
var R2_PART_SIZE = 10 * 1024 * 1024;
function cfg() {
  const accountId = (process.env.R2_ACCOUNT_ID || "").trim() || DEFAULT_ACCOUNT_ID;
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
  const bucket2 = (process.env.R2_BUCKET || "").trim() || DEFAULT_BUCKET;
  const endpoint = (process.env.R2_ENDPOINT || "").trim() || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  return { accessKeyId, secretAccessKey, bucket: bucket2, endpoint };
}
function r2Enabled() {
  const c = cfg();
  return Boolean(c.accessKeyId && c.secretAccessKey && c.bucket && c.endpoint);
}
var client = null;
function s3() {
  if (!client) {
    const c = cfg();
    client = new import_client_s3.S3Client({
      region: "auto",
      endpoint: c.endpoint,
      credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
      forcePathStyle: true
    });
  }
  return client;
}
var bucket = () => cfg().bucket;
var keyOf = (storedName) => PREFIX + storedName;
async function r2StartUpload(storedName, contentType) {
  const out = await s3().send(new import_client_s3.CreateMultipartUploadCommand({
    Bucket: bucket(),
    Key: keyOf(storedName),
    ContentType: contentType
  }));
  if (!out.UploadId) throw new Error("R2 did not start the upload");
  return out.UploadId;
}
async function r2SignParts(storedName, uploadId, partNumbers) {
  const urls = {};
  await Promise.all(partNumbers.map(async (n) => {
    urls[n] = await (0, import_s3_request_presigner.getSignedUrl)(
      s3(),
      new import_client_s3.UploadPartCommand({ Bucket: bucket(), Key: keyOf(storedName), UploadId: uploadId, PartNumber: n }),
      { expiresIn: 60 * 60 * 6 }
    );
  }));
  return urls;
}
async function r2CompleteUpload(storedName, uploadId, parts) {
  await s3().send(new import_client_s3.CompleteMultipartUploadCommand({
    Bucket: bucket(),
    Key: keyOf(storedName),
    UploadId: uploadId,
    MultipartUpload: { Parts: parts.slice().sort((a, b) => a.PartNumber - b.PartNumber) }
  }));
  const head = await s3().send(new import_client_s3.HeadObjectCommand({ Bucket: bucket(), Key: keyOf(storedName) }));
  return Number(head.ContentLength || 0);
}
async function r2PutFile(localPath, storedName, contentType) {
  const size = import_fs5.default.statSync(localPath).size;
  await s3().send(new import_client_s3.PutObjectCommand({
    Bucket: bucket(),
    Key: keyOf(storedName),
    Body: import_fs5.default.createReadStream(localPath),
    ContentLength: size,
    ContentType: contentType
  }));
  const head = await s3().send(new import_client_s3.HeadObjectCommand({ Bucket: bucket(), Key: keyOf(storedName) }));
  if (Number(head.ContentLength || 0) !== size) throw new Error("size check failed after copying to R2");
  return size;
}
async function r2AbortUpload(storedName, uploadId) {
  await s3().send(new import_client_s3.AbortMultipartUploadCommand({ Bucket: bucket(), Key: keyOf(storedName), UploadId: uploadId }));
}
async function r2FileUrl(storedName, opts) {
  const safeName = (opts.downloadName || "").replace(/["\\\r\n]/g, "_");
  return (0, import_s3_request_presigner.getSignedUrl)(
    s3(),
    new import_client_s3.GetObjectCommand({
      Bucket: bucket(),
      Key: keyOf(storedName),
      ResponseContentType: opts.contentType,
      ResponseContentDisposition: safeName ? `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(opts.downloadName || "")}` : void 0
    }),
    { expiresIn: 60 * 60 }
  );
}
async function r2Delete(storedName) {
  try {
    const head = await s3().send(new import_client_s3.HeadObjectCommand({ Bucket: bucket(), Key: keyOf(storedName) }));
    await s3().send(new import_client_s3.DeleteObjectCommand({ Bucket: bucket(), Key: keyOf(storedName) }));
    return Number(head.ContentLength || 0);
  } catch {
    return 0;
  }
}
async function r2Usage() {
  let bytes = 0;
  let files = 0;
  let token;
  do {
    const out = await s3().send(new import_client_s3.ListObjectsV2Command({ Bucket: bucket(), Prefix: PREFIX, ContinuationToken: token }));
    for (const o of out.Contents || []) {
      bytes += Number(o.Size || 0);
      files += 1;
    }
    token = out.IsTruncated ? out.NextContinuationToken : void 0;
  } while (token);
  return { bytes, files };
}

// server/storageCleanup.ts
var TEMP_UPLOADS_DIR = import_path4.default.join(UPLOADS_DIR, "temp_chunks");
function getDirStats(dirPath) {
  let totalBytes = 0;
  let totalFiles = 0;
  if (!import_fs6.default.existsSync(dirPath)) return { totalBytes: 0, totalFiles: 0 };
  const entries = import_fs6.default.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = import_path4.default.join(dirPath, entry.name);
    try {
      if (entry.isDirectory()) {
        const sub = getDirStats(fullPath);
        totalBytes += sub.totalBytes;
        totalFiles += sub.totalFiles;
      } else if (entry.isFile()) {
        totalBytes += import_fs6.default.statSync(fullPath).size;
        totalFiles += 1;
      }
    } catch {
    }
  }
  return { totalBytes, totalFiles };
}
function cleanStaleChunks() {
  if (!import_fs6.default.existsSync(TEMP_UPLOADS_DIR)) return 0;
  let cleanedCount = 0;
  const now = Date.now();
  const maxAgeMs = 24 * 60 * 60 * 1e3;
  try {
    const entries = import_fs6.default.readdirSync(TEMP_UPLOADS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = import_path4.default.join(TEMP_UPLOADS_DIR, entry.name);
      try {
        const stats = import_fs6.default.statSync(fullPath);
        if (now - stats.mtimeMs > maxAgeMs) {
          if (entry.isDirectory()) {
            import_fs6.default.rmSync(fullPath, { recursive: true, force: true });
          } else {
            import_fs6.default.unlinkSync(fullPath);
          }
          cleanedCount++;
        }
      } catch {
      }
    }
  } catch {
  }
  return cleanedCount;
}
async function runStorageLifecycleCleanup(retentionDays = 90) {
  const days = Math.max(1, retentionDays);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
  const cutoffDateStr = cutoff.toISOString().slice(0, 10);
  const chunksCleaned = cleanStaleChunks();
  const { rows } = await pool.query(
    `SELECT id, title, video_url, video_filename, video_filesize, scheduled_date, video_uploaded_at
       FROM content_items
      WHERE scheduled_date < $1
        AND (video_url IS NOT NULL OR video_filename IS NOT NULL)`,
    [cutoffDateStr]
  );
  let filesDeleted = 0;
  let bytesFreed = 0;
  let itemsUpdated = 0;
  const purgedItems = [];
  for (const item of rows) {
    let rawFilename = item.video_url ? import_path4.default.basename(String(item.video_url).replace(/\/download$/, "")) : item.video_filename;
    if (rawFilename && import_path4.default.basename(rawFilename).startsWith("sample-reel-")) rawFilename = null;
    let freedForItem = 0;
    if (rawFilename) {
      const sanitized = import_path4.default.basename(rawFilename);
      const filePath = import_path4.default.join(UPLOADS_DIR, sanitized);
      if (import_fs6.default.existsSync(filePath)) {
        try {
          const stats = import_fs6.default.statSync(filePath);
          freedForItem = stats.size;
          import_fs6.default.unlinkSync(filePath);
          filesDeleted++;
          bytesFreed += freedForItem;
        } catch (err) {
          console.warn(`[Storage Lifecycle] Could not delete file ${filePath}: ${err.message}`);
        }
      } else if (r2Enabled()) {
        freedForItem = await r2Delete(sanitized);
        if (freedForItem > 0) {
          filesDeleted++;
          bytesFreed += freedForItem;
        }
      }
    }
    try {
      await pool.query(
        `UPDATE content_items
            SET video_url = NULL,
                video_filename = NULL,
                video_filesize = NULL,
                editor_notes = CASE 
                  WHEN editor_notes IS NULL OR editor_notes = '' 
                  THEN '[Storage Lifecycle]: Media auto-purged per ${days}-day retention policy'
                  ELSE editor_notes || E'
[Storage Lifecycle]: Media auto-purged per ${days}-day retention policy'
                END,
                updated_at = NOW()
          WHERE id = $1`,
        [item.id]
      );
      itemsUpdated++;
      purgedItems.push({
        id: item.id,
        title: item.title,
        filename: rawFilename,
        bytes: freedForItem
      });
      await pool.query(
        `INSERT INTO activity_logs (id, content_id, user_id, user_name, user_role, action, description)
         VALUES ($1, $2, 'system', 'Storage Lifecycle', 'system', 'storage_cleanup', $3)`,
        [
          `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          item.id,
          `Auto-purged media file for "${item.title}" per ${days}-day storage retention policy.`
        ]
      );
    } catch (err) {
      console.error(`[Storage Lifecycle] Failed to update content row ${item.id}:`, err);
    }
  }
  return {
    success: true,
    filesDeleted,
    bytesFreed,
    chunksCleaned,
    itemsUpdated,
    retentionDays: days,
    cutoffDate: cutoffDateStr,
    purgedItems
  };
}
async function getStorageUsageStats(retentionDays = 90) {
  const days = Math.max(1, retentionDays);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
  const cutoffDateStr = cutoff.toISOString().slice(0, 10);
  const local = getDirStats(UPLOADS_DIR);
  let totalBytes = local.totalBytes;
  let totalFiles = local.totalFiles;
  if (r2Enabled()) {
    try {
      const r2 = await r2Usage();
      totalBytes += r2.bytes;
      totalFiles += r2.files;
    } catch (err) {
      console.warn(`[Storage] Could not read Cloudflare R2 usage: ${err.message}`);
    }
  }
  const { rows } = await pool.query(
    `SELECT id, video_url, video_filename, video_filesize
       FROM content_items
      WHERE scheduled_date < $1
        AND (video_url IS NOT NULL OR video_filename IS NOT NULL)`,
    [cutoffDateStr]
  );
  let reclaimableBytes = 0;
  for (const item of rows) {
    if (item.video_filesize) {
      reclaimableBytes += Number(item.video_filesize);
    } else if (item.video_filename) {
      const p = import_path4.default.join(UPLOADS_DIR, import_path4.default.basename(item.video_filename));
      if (import_fs6.default.existsSync(p)) {
        try {
          reclaimableBytes += import_fs6.default.statSync(p).size;
        } catch {
        }
      }
    }
  }
  return {
    totalDiskUsageBytes: totalBytes,
    totalDiskFilesCount: totalFiles,
    eligibleItemsCount: rows.length,
    reclaimableBytes,
    retentionDays: days,
    cutoffDate: cutoffDateStr
  };
}
var MIME = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".qt": "video/quicktime",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".wmv": "video/x-ms-wmv",
  ".flv": "video/x-flv",
  ".3gp": "video/3gpp",
  ".ts": "video/mp2t",
  ".mts": "video/mp2t",
  ".m2ts": "video/mp2t",
  ".ogv": "video/ogg",
  ".ogg": "video/ogg",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".zip": "application/zip"
};
var migrating = false;
async function moveServerFilesToR2() {
  const result = { moved: 0, removed: 0, bytes: 0, failed: 0 };
  if (!r2Enabled() || migrating || !import_fs6.default.existsSync(UPLOADS_DIR)) return result;
  migrating = true;
  try {
    const files = import_fs6.default.readdirSync(UPLOADS_DIR, { withFileTypes: true }).filter((e) => e.isFile() && !e.name.startsWith("sample-reel-") && !e.name.startsWith(".")).map((e) => e.name);
    for (const name of files) {
      const localPath = import_path4.default.join(UPLOADS_DIR, name);
      try {
        const stat = import_fs6.default.statSync(localPath);
        if (Date.now() - stat.mtimeMs < 10 * 60 * 1e3) continue;
        const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM content_items WHERE video_url = $1", [`/api/videos/${name}`]);
        if (rows[0]?.n > 0) {
          await r2PutFile(localPath, name, MIME[import_path4.default.extname(name).toLowerCase()] || "application/octet-stream");
          result.moved++;
        } else {
          result.removed++;
        }
        import_fs6.default.unlinkSync(localPath);
        result.bytes += stat.size;
      } catch (err) {
        result.failed++;
        console.warn(`[Storage] Could not move ${name} to Cloudflare R2: ${err.message}`);
      }
    }
    if (result.moved || result.removed || result.failed) {
      console.log(
        `\u2601\uFE0F  [Storage] Moved ${result.moved} file(s) to Cloudflare R2, removed ${result.removed} unused \u2014 ${(result.bytes / (1024 * 1024)).toFixed(1)} MB freed on the server` + (result.failed ? `; ${result.failed} will be retried` : "")
      );
    }
  } finally {
    migrating = false;
  }
  return result;
}
function startStorageLifecycleScheduler() {
  const checkAndRun = async () => {
    try {
      const { rows } = await pool.query("SELECT auto_cleanup_enabled, retention_days FROM settings LIMIT 1");
      const settings = rows[0];
      const isEnabled = settings ? settings.auto_cleanup_enabled !== false : true;
      const days = settings && settings.retention_days ? Number(settings.retention_days) : 90;
      await moveServerFilesToR2().catch((err) => console.warn(`[Storage] Move to R2 skipped: ${err.message}`));
      if (!isEnabled) {
        console.log("[Storage Lifecycle]: 90-day auto-cleanup is currently disabled in settings.");
        return;
      }
      console.log(`\u{1F9F9} [Storage Lifecycle]: Running scheduled ${days}-day auto-delete storage cleanup...`);
      const result = await runStorageLifecycleCleanup(days);
      const mbFreed = (result.bytesFreed / (1024 * 1024)).toFixed(2);
      console.log(
        `\u2705 [Storage Lifecycle]: Completed. Freed ${mbFreed} MB across ${result.filesDeleted} files (${result.chunksCleaned} stale chunks removed).`
      );
    } catch (err) {
      console.error("[Storage Lifecycle] Scheduled cleanup error:", err);
    }
  };
  setTimeout(checkAndRun, 15e3);
  setInterval(checkAndRun, 24 * 60 * 60 * 1e3);
}

// server/auth.ts
var import_crypto2 = __toESM(require("crypto"), 1);
var SESSION_COOKIE = "cf_session";
var SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 30);
function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return void 0;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return void 0;
      }
    }
  }
  return void 0;
}
function isSecureRequest(req) {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return req.secure || req.headers["x-forwarded-proto"] === "https";
}
function setSessionCookie(req, res, token) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_DAYS * 24 * 60 * 60}`
  ];
  if (isSecureRequest(req)) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}
function clearSessionCookie(req, res) {
  const parts = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (isSecureRequest(req)) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}
function newSessionToken() {
  const token = import_crypto2.default.randomBytes(32).toString("hex");
  return { token, hash: hashToken(token) };
}
function hashToken(token) {
  return import_crypto2.default.createHash("sha256").update(token).digest("hex");
}
var attempts = /* @__PURE__ */ new Map();
var WINDOW_MS = 5 * 60 * 1e3;
var MAX_ATTEMPTS = 50;
function tooManyAttempts(key) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.first > WINDOW_MS) return false;
  return entry.count >= MAX_ATTEMPTS;
}
function recordFailedAttempt(key) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: now });
  } else {
    entry.count++;
  }
}
function clearAttempts(key) {
  attempts.delete(key);
}

// server.ts
var PORT = Number(process.env.PORT || 3e3);
async function keepInR2(localPath, storedName) {
  if (!r2Enabled()) return;
  const ext = import_path5.default.extname(storedName).toLowerCase();
  await r2PutFile(localPath, storedName, MIME_BY_EXT[ext] || "application/octet-stream");
  import_fs7.default.unlinkSync(localPath);
}
var CONTENT_STATUSES = ["PLANNED", "EDITING", "READY_TO_POST", "POSTED", "REVISION", "ISSUE"];
var PLATFORMS = ["instagram", "tiktok", "youtube_shorts", "linkedin", "x", "facebook"];
var ISSUE_TYPES = [
  "video_not_downloading",
  "wrong_video",
  "caption_issue",
  "video_editing_problem",
  "platform_issue",
  "cannot_publish",
  "other"
];
var VIDEO_EXTENSIONS = [
  ".mp4",
  ".mov",
  ".webm",
  ".m4v",
  ".mkv",
  ".avi",
  ".wmv",
  ".flv",
  ".3gp",
  ".ts",
  ".mts",
  ".m2ts",
  ".ogv",
  ".ogg",
  ".qt"
];
var DESIGN_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".zip"];
var ALLOWED_EXTENSIONS = [...VIDEO_EXTENSIONS, ...DESIGN_EXTENSIONS];
var MIME_BY_EXT = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".qt": "video/quicktime",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".wmv": "video/x-ms-wmv",
  ".flv": "video/x-flv",
  ".3gp": "video/3gpp",
  ".ts": "video/mp2t",
  ".mts": "video/mp2t",
  ".m2ts": "video/mp2t",
  ".ogv": "video/ogg",
  ".ogg": "video/ogg",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".zip": "application/zip"
};
function removeReplacedFile(previousUrl) {
  if (!previousUrl || !previousUrl.startsWith("/api/videos/")) return;
  const name = import_path5.default.basename(previousUrl);
  if (!name || name.startsWith("sample-reel-")) return;
  (async () => {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM content_items WHERE video_url = $1", [previousUrl]);
    if (rows[0]?.n > 0) return;
    const local = import_path5.default.join(UPLOADS_DIR, name);
    if (import_fs7.default.existsSync(local)) import_fs7.default.unlinkSync(local);
    else if (r2Enabled()) await r2Delete(name);
  })().catch((err) => console.warn(`\u26A0\uFE0F  Could not remove replaced file ${name}: ${err.message}`));
}
function safeStoredName(originalName) {
  const ext = import_path5.default.extname(originalName).toLowerCase() || ".mp4";
  const cleanBase = import_path5.default.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "file";
  const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  return `${cleanBase}-${unique}${ext}`;
}
var storage = import_multer.default.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => cb(null, safeStoredName(file.originalname))
});
var upload = (0, import_multer.default)({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  // 500MB
  fileFilter: (_req, file, cb) => {
    const ext = import_path5.default.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type "${ext || "unknown"}". Allowed: videos (MP4, MOV, WEBM\u2026), images (JPG, PNG, WEBP, GIF), PDF or ZIP.`));
    }
  }
});
var TEMP_UPLOADS_DIR2 = import_path5.default.join(UPLOADS_DIR, "temp_chunks");
if (!import_fs7.default.existsSync(TEMP_UPLOADS_DIR2)) {
  import_fs7.default.mkdirSync(TEMP_UPLOADS_DIR2, { recursive: true });
}
var chunkStorage = import_multer.default.diskStorage({
  destination: (req, _file, cb) => {
    const rawUploadId = req.query.uploadId || req.body?.uploadId || "chunk";
    const uploadId = String(rawUploadId).replace(/[^a-zA-Z0-9_-]/g, "_");
    const dir = import_path5.default.join(TEMP_UPLOADS_DIR2, uploadId);
    if (!import_fs7.default.existsSync(dir)) import_fs7.default.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, _file, cb) => {
    const rawChunkIndex = req.query.chunkIndex !== void 0 ? req.query.chunkIndex : req.body?.chunkIndex;
    const chunkIndex = parseInt(String(rawChunkIndex), 10) || 0;
    cb(null, `part-${chunkIndex}`);
  }
});
var uploadChunk = (0, import_multer.default)({
  storage: chunkStorage,
  limits: { fileSize: 30 * 1024 * 1024 }
  // 30MB per chunk
});
function canViewContent(user, item) {
  return isManagerial(user.role) || item.editor_id === user.id || item.poster_id === user.id;
}
async function canUploadFinal(user, item) {
  if (canManageContent(user.role)) return null;
  if (!isCreator(user.role) || item.editor_id !== user.id) {
    return "Only the assigned Graphic Designer / Video Editor (or an Admin) can upload the final file.";
  }
  if (item.status === "POSTED") return "This content is already posted \u2014 the final file can no longer be replaced.";
  if (item.video_url) {
    const settings = await db.getSettings();
    if (!settings.allow_editor_replace) return "Replacing an uploaded file is turned off in Settings. Ask an Admin.";
  }
  return null;
}
function canMarkPosted(user, item) {
  return canManageContent(user.role) || isPoster(user.role) && item.poster_id === user.id;
}
var asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
function cleanWhatsapp(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}
function publicUser(u) {
  return u;
}
async function startServer() {
  const app = (0, import_express.default)();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  const dbState = {
    ready: false,
    error: "Connecting to the database\u2026",
    since: (/* @__PURE__ */ new Date()).toISOString()
  };
  const connectDatabase = async () => {
    try {
      if (!dbState.ready && await db.quickStart()) {
        dbState.ready = true;
        dbState.error = null;
        dbState.since = (/* @__PURE__ */ new Date()).toISOString();
        console.log("\u2705 Database reachable \u2014 serving requests (finishing start-up checks in the background)");
      }
      await db.init();
      dbState.ready = true;
      dbState.error = null;
      dbState.since = (/* @__PURE__ */ new Date()).toISOString();
      if (r2Enabled()) {
        console.log("\u2601\uFE0F  [Storage] Cloudflare R2 is on \u2014 uploads are stored in R2");
        moveServerFilesToR2().catch((e) => console.warn(`[Storage] Move to R2 failed: ${e.message}`));
      }
    } catch (err) {
      const msg = err.message || String(err);
      if (dbState.ready) {
        console.error(`\u26A0\uFE0F [Database] Start-up checks did not finish (${msg}). The app keeps running.`);
        return;
      }
      dbState.ready = false;
      dbState.error = msg;
      console.error(`\u26A0\uFE0F [Database] Not connected (${msg}). Retrying in 15 s\u2026`);
      setTimeout(connectDatabase, 15e3);
    }
  };
  connectDatabase();
  app.use(import_express.default.json({ limit: "1mb" }));
  app.use(import_express.default.urlencoded({ extended: true }));
  app.get("/api/health", (_req, res) => {
    res.status(dbState.ready ? 200 : 503).json({
      status: dbState.ready ? "ok" : "database_unavailable",
      database: dbState.ready ? "connected" : dbState.error,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.use("/api", (_req, res, next) => {
    if (dbState.ready) return next();
    res.status(503).json({
      error: `The server can't reach the database right now (${dbState.error}). It retries automatically every 15 seconds \u2014 check DATABASE_URL if this continues.`
    });
  });
  app.get("/api/auth/config", asyncHandler(async (_req, res) => {
    const settings = await db.getSettings();
    res.json({ workspaceName: settings.workspace_name });
  }));
  async function startSession(req, res, user, method) {
    const { token, hash } = newSessionToken();
    await db.createSession(hash, user.id, method, SESSION_TTL_DAYS);
    setSessionCookie(req, res, token);
  }
  app.post("/api/auth/login", asyncHandler(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const limiterKey = `pw:${req.ip}:${email}`;
    if (tooManyAttempts(limiterKey)) {
      return res.status(429).json({ error: "Too many sign-in attempts. Please wait 15 minutes and try again." });
    }
    const user = await db.verifyUserPassword(email, password);
    if (!user) {
      recordFailedAttempt(limiterKey);
      const exists = await db.getUserByEmail(email);
      if (!exists) {
        console.warn(`\u26A0\uFE0F [Auth] Login failed: User not found for "${email}"`);
      } else if (!exists.password_hash) {
        console.warn(`\u26A0\uFE0F [Auth] Login failed: No password hash for "${email}"`);
        return res.status(401).json({ error: "Your password has not been set yet. Ask an Admin to set it." });
      } else {
        console.warn(`\u26A0\uFE0F [Auth] Login failed: Wrong password for "${email}"`);
      }
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (user.status !== "active") {
      console.warn(`\u26A0\uFE0F [Auth] Login blocked: Inactive account "${email}"`);
      return res.status(403).json({ error: "This account has been deactivated. Contact an Admin." });
    }
    clearAttempts(limiterKey);
    await startSession(req, res, user, "password");
    await db.touchLastLogin(user.id);
    console.log(`\u2705 [Auth] Signed in: ${user.name} (${user.email}) as ${user.role}`);
    res.json({ success: true, user: publicUser(user) });
  }));
  app.post("/api/auth/logout", asyncHandler(async (req, res) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) await db.deleteSession(hashToken(token));
    clearSessionCookie(req, res);
    res.json({ success: true });
  }));
  app.use("/api", asyncHandler(async (req, res, next) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) return res.status(401).json({ error: "Please sign in to continue." });
    const tokenHash = hashToken(token);
    const session = await db.getSession(tokenHash);
    if (!session) {
      clearSessionCookie(req, res);
      return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    }
    req.user = session.user;
    req.session = { ...session, tokenHash };
    next();
  }));
  app.post("/api/auth/change-password", asyncHandler(async (req, res) => {
    const user = req.session.realUser;
    const current = String(req.body?.current_password || "");
    const next = String(req.body?.new_password || "");
    const limiterKey = `chpw:${user.id}`;
    if (tooManyAttempts(limiterKey)) {
      return res.status(429).json({ error: "Too many attempts. Please wait 15 minutes and try again." });
    }
    if (!await db.checkPassword(user.id, current)) {
      recordFailedAttempt(limiterKey);
      return res.status(400).json({ error: "Your current password is not correct." });
    }
    if (next.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters." });
    if (next === current) return res.status(400).json({ error: "New password must be different from the current one." });
    clearAttempts(limiterKey);
    const updated = await db.updateUser(user.id, { password: next, must_change_password: false });
    await db.deleteSessionsForUser(user.id, req.session.tokenHash);
    await db.logActivity({
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      action: "password_changed",
      description: `${user.name} changed their password.`
    });
    res.json({ success: true, user: updated });
  }));
  app.get("/api/auth/me", asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  }));
  app.get("/api/push/key", (_req, res) => {
    res.json({ publicKey: pushPublicKey() });
  });
  app.post("/api/push/subscribe", asyncHandler(async (req, res) => {
    const ok = await saveSubscription(pool, req.user.id, req.body?.subscription);
    if (!ok) return res.status(400).json({ error: "Invalid push subscription" });
    res.json({ success: true });
  }));
  app.post("/api/push/unsubscribe", asyncHandler(async (req, res) => {
    const endpoint = String(req.body?.endpoint || "");
    if (endpoint) await removeSubscription(pool, endpoint);
    res.json({ success: true });
  }));
  app.get("/api/users", asyncHandler(async (req, res) => {
    const users = await db.getUsers();
    const showPhones = canManageContent(req.user.role);
    res.json({
      users: showPhones ? users : users.map((u) => u.id === req.user.id ? u : { ...u, whatsapp: "" })
    });
  }));
  app.post("/api/users", asyncHandler(async (req, res) => {
    const actor = req.user;
    if (!canManageTeam(actor.role)) {
      return res.status(403).json({ error: "Only Admins can add team members." });
    }
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const role = req.body?.role;
    const password = req.body?.password ? String(req.body.password) : "";
    if (!name || !email || !role) {
      return res.status(400).json({ error: "Name, email, and role are required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }
    if (!isValidRole(role) || !assignableRoles(actor.role).includes(role)) {
      return res.status(403).json({ error: `You cannot create a ${roleLabel(role)} account.` });
    }
    if (await db.getUserByEmail(email)) {
      return res.status(409).json({ error: `${email} is already on the team.` });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Set a password of at least 8 characters for this member" });
    }
    const whatsapp = cleanWhatsapp(req.body?.whatsapp);
    if (whatsapp === null) return res.status(400).json({ error: "Enter a valid WhatsApp number (10 digits, or with country code)." });
    const newUser = await db.createUser({ name, email, role, password, status: "active", whatsapp });
    await db.logActivity({
      user_id: actor.id,
      user_name: actor.name,
      user_role: actor.role,
      action: "user_added",
      description: `${actor.name} added ${newUser.name} (${newUser.email}) as ${roleLabel(newUser.role)}.`
    });
    res.status(201).json({ user: newUser });
  }));
  app.get("/api/users/:id/password", asyncHandler(async (req, res) => {
    if (!canManageTeam(req.user.role)) {
      return res.status(403).json({ error: "Only Admins can view passwords." });
    }
    const target = await db.getUserById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found" });
    const password = await db.revealPassword(target.id);
    res.setHeader("Cache-Control", "no-store");
    if (password === null) {
      return res.status(404).json({ error: "This person changed their password before the current password key was set up, so it can't be read here. It will show after they sign in once \u2014 or set a new one with the edit button." });
    }
    await db.logActivity({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: "password_viewed",
      description: `${req.user.name} viewed ${target.name}'s password.`
    });
    res.json({ password });
  }));
  app.delete("/api/users/:id", asyncHandler(async (req, res) => {
    const actor = req.user;
    if (!canManageTeam(actor.role)) {
      return res.status(403).json({ error: "Only Admins can delete team members." });
    }
    const target = await db.getUserById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target.id === actor.id) {
      return res.status(400).json({ error: "You cannot delete your own account." });
    }
    if (target.role === "admin" && await db.countActiveAdmins(target.id) === 0) {
      return res.status(400).json({ error: "There must always be at least one active Admin." });
    }
    await db.deleteUser(target.id);
    await db.logActivity({
      user_id: actor.id,
      user_name: actor.name,
      user_role: actor.role,
      action: "user_deleted",
      description: `${actor.name} deleted the account of ${target.name} (${roleLabel(target.role)}, ${target.email}).`
    });
    res.json({ success: true });
  }));
  app.patch("/api/users/:id", asyncHandler(async (req, res) => {
    const actor = req.user;
    if (!canManageTeam(actor.role)) {
      return res.status(403).json({ error: "Only Admins can edit team members." });
    }
    const target = await db.getUserById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found" });
    const updates = {};
    if (req.body.name !== void 0) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: "Name cannot be empty" });
      updates.name = name;
    }
    if (req.body.email !== void 0) {
      const email = String(req.body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Please enter a valid email address" });
      }
      const clash = await db.getUserByEmail(email);
      if (clash && clash.id !== target.id) {
        return res.status(409).json({ error: `${email} is already used by ${clash.name}.` });
      }
      updates.email = email;
    }
    if (req.body.role !== void 0 && req.body.role !== target.role) {
      const role = req.body.role;
      if (target.id === actor.id) {
        return res.status(400).json({ error: "You cannot change your own role." });
      }
      const allowed = assignableRoles(actor.role);
      if (!isValidRole(role) || !allowed.includes(role)) {
        return res.status(403).json({ error: `You cannot assign the ${roleLabel(role)} role.` });
      }
      updates.role = role;
    }
    if (req.body.whatsapp !== void 0) {
      const whatsapp = cleanWhatsapp(req.body.whatsapp);
      if (whatsapp === null) return res.status(400).json({ error: "Enter a valid WhatsApp number (10 digits, or with country code)." });
      updates.whatsapp = whatsapp;
    }
    if (req.body.status !== void 0 && req.body.status !== target.status) {
      const status = req.body.status;
      if (status !== "active" && status !== "disabled") {
        return res.status(400).json({ error: "Status must be active or disabled" });
      }
      if (target.id === actor.id && status === "disabled") {
        return res.status(400).json({ error: "You cannot disable your own account." });
      }
      updates.status = status;
    }
    if (req.body.password) {
      const password = String(req.body.password);
      if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
      updates.password = password;
    }
    const losingAdmin = target.role === "admin" && (updates.role && updates.role !== "admin" || updates.status === "disabled");
    if (losingAdmin && await db.countActiveAdmins(target.id) === 0) {
      return res.status(400).json({ error: "There must always be at least one active Admin." });
    }
    const updated = await db.updateUser(target.id, updates);
    if (!updated) return res.status(404).json({ error: "User not found" });
    if (updates.status === "disabled" || updates.password && target.id !== actor.id) {
      await db.deleteSessionsForUser(target.id);
    }
    const changes = [];
    if (updates.role) changes.push(`role \u2192 ${roleLabel(updates.role)}`);
    if (updates.status) changes.push(updates.status === "disabled" ? "deactivated the account" : "activated the account");
    if (updates.email) changes.push(`email \u2192 ${updates.email}`);
    if (updates.name) changes.push(`name \u2192 ${updates.name}`);
    if (updates.password) changes.push("set a new password");
    if (changes.length) {
      await db.logActivity({
        user_id: actor.id,
        user_name: actor.name,
        user_role: actor.role,
        action: "user_updated",
        description: `${actor.name} updated ${target.name}: ${changes.join(", ")}.`
      });
    }
    res.json({ user: updated });
  }));
  app.get("/api/metrics", asyncHandler(async (req, res) => {
    res.json(await db.getOperationalMetrics(req.user));
  }));
  app.get("/api/content", asyncHandler(async (req, res) => {
    const { status, editor_id, poster_id, platform, date, search } = req.query;
    const items = await db.getContentList({
      status,
      editor_id,
      poster_id,
      platform,
      date,
      search,
      visibleTo: req.user
    });
    res.json({ content: items });
  }));
  app.get("/api/content/:id", asyncHandler(async (req, res) => {
    const item = await db.getContentById(req.params.id);
    if (!item || !canViewContent(req.user, item)) {
      return res.status(404).json({ error: "Content item not found" });
    }
    const logs = await db.getActivityLogs(item.id, 200);
    const issues = await db.getIssues(item.id);
    res.json({ content: item, activity_logs: logs, issues });
  }));
  async function validateAssignees(editorId, posterId) {
    if (editorId) {
      const ed = await db.getUserById(editorId);
      if (!ed || ed.status !== "active") return "The selected Graphic Designer / Video Editor is not an active team member.";
    }
    if (posterId) {
      const po = await db.getUserById(posterId);
      if (!po || po.status !== "active") return "The selected Intern is not an active team member.";
    }
    return null;
  }
  app.post("/api/content", asyncHandler(async (req, res) => {
    const currentUser = req.user;
    if (!canManageContent(currentUser.role)) {
      return res.status(403).json({ error: "Only Admins and Managers can create content." });
    }
    const {
      title,
      description,
      content_type,
      platform,
      scheduled_date,
      scheduled_time,
      editor_id,
      poster_id,
      caption,
      hashtags,
      instructions,
      reference_notes,
      internal_notes,
      tags,
      category
    } = req.body;
    if (!title || !scheduled_date || !scheduled_time || !editor_id) {
      return res.status(400).json({
        error: "Title, scheduled date, scheduled time and the designer/editor are required"
      });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date) || !/^\d{2}:\d{2}/.test(scheduled_time)) {
      return res.status(400).json({ error: "Invalid scheduled date or time" });
    }
    if (platform && !PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: "Unknown platform" });
    }
    const assigneeError = await validateAssignees(editor_id, poster_id);
    if (assigneeError) return res.status(400).json({ error: assigneeError });
    const newItem = await db.createContent(
      {
        title: String(title).trim(),
        description: description || "",
        content_type: content_type || "reel",
        platform: platform || (await db.getSettings()).default_platform || "instagram",
        category: category || "Education",
        scheduled_date,
        scheduled_time: String(scheduled_time).slice(0, 5),
        editor_id,
        poster_id: poster_id || null,
        caption: caption || "",
        hashtags: hashtags || "",
        instructions: instructions || "",
        reference_notes,
        internal_notes,
        tags: Array.isArray(tags) ? tags.map(String).filter(Boolean) : [],
        status: "PLANNED",
        created_by: currentUser.id
      },
      currentUser
    );
    res.status(201).json({ content: newItem });
  }));
  const CREATOR_EDITABLE = ["status", "editor_notes"];
  app.patch("/api/content/:id", asyncHandler(async (req, res) => {
    const currentUser = req.user;
    const existing = await db.getContentById(req.params.id);
    if (!existing || !canViewContent(currentUser, existing)) {
      return res.status(404).json({ error: "Content not found" });
    }
    const body = req.body || {};
    const attempted = Object.keys(body);
    if (canManageContent(currentUser.role)) {
      if (body.status !== void 0 && !CONTENT_STATUSES.includes(body.status)) {
        return res.status(400).json({ error: "Unknown status" });
      }
      if (body.platform !== void 0 && !PLATFORMS.includes(body.platform)) {
        return res.status(400).json({ error: "Unknown platform" });
      }
      if (body.scheduled_date !== void 0 && !/^\d{4}-\d{2}-\d{2}$/.test(body.scheduled_date)) {
        return res.status(400).json({ error: "Invalid scheduled date" });
      }
      if (body.scheduled_time !== void 0) {
        if (!/^\d{2}:\d{2}/.test(body.scheduled_time)) return res.status(400).json({ error: "Invalid scheduled time" });
        body.scheduled_time = String(body.scheduled_time).slice(0, 5);
      }
      if (body.title !== void 0 && !String(body.title).trim()) {
        return res.status(400).json({ error: "Title cannot be empty" });
      }
      const assigneeError = await validateAssignees(
        body.editor_id !== existing.editor_id ? body.editor_id : void 0,
        body.poster_id !== existing.poster_id ? body.poster_id : void 0
      );
      if (assigneeError) return res.status(400).json({ error: assigneeError });
      for (const f of ["video_url", "video_filename", "video_filesize", "video_uploaded_at", "video_uploaded_by", "posted_by", "created_by"]) {
        delete body[f];
      }
      if (body.status === "POSTED" && existing.status !== "POSTED") {
        return res.status(400).json({ error: 'Use "Mark as Posted" so the posting details are recorded.' });
      }
    } else if (isCreator(currentUser.role) && existing.editor_id === currentUser.id) {
      const violations = attempted.filter((f) => !CREATOR_EDITABLE.includes(f));
      if (violations.length > 0) {
        return res.status(403).json({
          error: `${roleLabel(currentUser.role)}s cannot change ${violations.join(", ")}. Ask an Admin.`
        });
      }
      if (body.status !== void 0) {
        if (body.status !== "EDITING" || !["PLANNED", "REVISION", "ISSUE", "EDITING"].includes(existing.status)) {
          return res.status(403).json({ error: 'You can only move your own task to "Editing". Uploading the final file moves it to Ready to Post.' });
        }
      }
    } else {
      return res.status(403).json({
        error: isPoster(currentUser.role) ? 'Interns cannot edit content. Use "Mark as Posted" or "Report Issue".' : "You are not assigned to this content."
      });
    }
    const updated = await db.updateContent(req.params.id, body, currentUser);
    if (!updated) return res.status(404).json({ error: "Content not found" });
    res.json({ content: updated });
  }));
  app.post("/api/content/seed-instagram-calendar", asyncHandler(async (req, res) => {
    if (!canManageContent(req.user.role)) {
      return res.status(403).json({ error: "Only Admins can load demo content." });
    }
    const users = (await db.getUsers()).filter((u) => u.status === "active");
    const admin = req.user;
    const editor = users.find((u) => isCreator(u.role)) || admin;
    const poster = users.find((u) => isPoster(u.role)) || admin;
    const existingList = await db.getContentList({});
    const existingKeys = new Set(existingList.map((c) => `${c.title}-${c.scheduled_date}`));
    let addedCount = 0;
    for (const item of SAMPLE_CALENDAR_ITEMS) {
      if (!existingKeys.has(`${item.title}-${item.scheduled_date}`)) {
        await db.createContent({
          ...item,
          editor_id: editor.id,
          poster_id: poster.id,
          created_by: admin.id,
          tags: ["instagram", item.category.toLowerCase()]
        }, admin);
        addedCount++;
      }
    }
    res.json({ success: true, addedCount });
  }));
  const uploadGuard = asyncHandler(async (req, res, next) => {
    const item = await db.getContentById(req.params.id);
    if (!item || !canViewContent(req.user, item)) {
      return res.status(404).json({ error: "Content not found" });
    }
    const denied = await canUploadFinal(req.user, item);
    if (denied) return res.status(403).json({ error: denied });
    next();
  });
  app.post("/api/content/:id/upload-video", uploadGuard, (req, res) => {
    upload.single("video")(req, res, async (err) => {
      try {
        if (err) {
          if (err instanceof import_multer.default.MulterError && err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ error: "File size exceeds the 500MB limit." });
          }
          return res.status(400).json({ error: err.message || "Failed to process the uploaded file" });
        }
        const file = req.file;
        if (!file) return res.status(400).json({ error: "No file provided" });
        await keepInR2(file.path, file.filename);
        const videoUrl = `/api/videos/${file.filename}`;
        const previousUrl = (await db.getContentById(req.params.id))?.video_url;
        const updated = await db.uploadVideoForContent(
          req.params.id,
          { video_url: videoUrl, video_filename: file.originalname, video_filesize: file.size },
          req.user
        );
        if (!updated) return res.status(404).json({ error: "Content not found" });
        removeReplacedFile(previousUrl);
        res.json({ success: true, content: updated, file: { url: videoUrl, filename: file.originalname, size: file.size } });
      } catch (e) {
        console.error("Upload handling failed:", e);
        res.status(500).json({ error: "Upload failed on the server. Please try again." });
      }
    });
  });
  app.post("/api/content/:id/upload-chunk", uploadGuard, (req, res) => {
    uploadChunk.single("chunk")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: `Chunk upload error: ${err.message}` });
      }
      const uploadId = req.query.uploadId || req.body?.uploadId;
      const chunkIndex = req.query.chunkIndex !== void 0 ? req.query.chunkIndex : req.body?.chunkIndex;
      const totalChunks = req.query.totalChunks || req.body?.totalChunks;
      const filename = req.query.filename || req.body?.filename;
      const filesize = req.query.filesize || req.body?.filesize;
      const contentId = req.params.id;
      if (!uploadId || chunkIndex === void 0 || !totalChunks || !filename) {
        return res.status(400).json({ error: "Missing chunk metadata (uploadId, chunkIndex, totalChunks, filename)" });
      }
      const ext = import_path5.default.extname(String(filename)).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return res.status(400).json({ error: `Unsupported file type "${ext || "unknown"}".` });
      }
      const cleanUploadId = String(uploadId).replace(/[^a-zA-Z0-9_-]/g, "_");
      const chunkIdx = parseInt(String(chunkIndex), 10);
      const total = parseInt(String(totalChunks), 10);
      const chunkDir = import_path5.default.join(TEMP_UPLOADS_DIR2, cleanUploadId);
      if (chunkIdx + 1 < total) {
        return res.json({ success: true, chunkReceived: chunkIdx, total });
      }
      try {
        const uniqueName = safeStoredName(String(filename));
        const finalPath = import_path5.default.join(UPLOADS_DIR, uniqueName);
        if (import_fs7.default.existsSync(finalPath)) {
          try {
            import_fs7.default.unlinkSync(finalPath);
          } catch {
          }
        }
        for (let i = 0; i < total; i++) {
          const partPath = import_path5.default.join(chunkDir, `part-${i}`);
          if (!import_fs7.default.existsSync(partPath)) throw new Error(`Missing chunk #${i + 1}`);
          import_fs7.default.appendFileSync(finalPath, import_fs7.default.readFileSync(partPath));
        }
        try {
          import_fs7.default.rmSync(chunkDir, { recursive: true, force: true });
        } catch (rmErr) {
          console.error("Failed to cleanup temp chunk dir:", rmErr);
        }
        const stat = import_fs7.default.statSync(finalPath);
        await keepInR2(finalPath, uniqueName);
        const videoUrl = `/api/videos/${uniqueName}`;
        const previousUrl = (await db.getContentById(contentId))?.video_url;
        const updated = await db.uploadVideoForContent(
          contentId,
          { video_url: videoUrl, video_filename: String(filename), video_filesize: stat.size || parseInt(String(filesize), 10) || 0 },
          req.user
        );
        if (!updated) return res.status(404).json({ error: "Content item not found" });
        removeReplacedFile(previousUrl);
        return res.json({ success: true, content: updated, file: { url: videoUrl, filename, size: stat.size } });
      } catch (assembleErr) {
        console.error("Error assembling chunks:", assembleErr);
        return res.status(500).json({ error: `Failed to assemble the uploaded file: ${assembleErr.message}` });
      }
    });
  });
  const R2_MAX_BYTES = 2 * 1024 * 1024 * 1024;
  const r2Pending = /* @__PURE__ */ new Map();
  const r2PendingFor = (req) => {
    const uploadId = String(req.body?.uploadId || "");
    const p = r2Pending.get(uploadId);
    return p && p.contentId === req.params.id && p.userId === req.user.id ? { uploadId, ...p } : null;
  };
  app.post("/api/content/:id/r2-upload/start", uploadGuard, asyncHandler(async (req, res) => {
    if (!r2Enabled()) return res.json({ enabled: false });
    const filename = String(req.body?.filename || "").slice(0, 200);
    const filesize = Number(req.body?.filesize || 0);
    const ext = import_path5.default.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ error: `Unsupported file type "${ext || "unknown"}". Allowed: videos (MP4, MOV, WEBM\u2026), images (JPG, PNG, WEBP, GIF), PDF or ZIP.` });
    }
    if (!filesize || filesize > R2_MAX_BYTES) {
      return res.status(400).json({ error: "File size exceeds the 2 GB limit." });
    }
    for (const [id, p] of r2Pending) if (Date.now() - p.at > 12 * 36e5) r2Pending.delete(id);
    const storedName = safeStoredName(filename);
    const uploadId = await r2StartUpload(storedName, MIME_BY_EXT[ext] || "application/octet-stream");
    r2Pending.set(uploadId, { storedName, contentId: req.params.id, userId: req.user.id, filename, at: Date.now() });
    const totalParts = Math.max(1, Math.ceil(filesize / R2_PART_SIZE));
    const urls = await r2SignParts(storedName, uploadId, Array.from({ length: totalParts }, (_, i) => i + 1));
    res.json({ enabled: true, uploadId, partSize: R2_PART_SIZE, totalParts, urls });
  }));
  app.post("/api/content/:id/r2-upload/complete", uploadGuard, asyncHandler(async (req, res) => {
    const p = r2PendingFor(req);
    if (!p) return res.status(400).json({ error: "This upload has expired \u2014 please upload the file again." });
    const parts = (Array.isArray(req.body?.parts) ? req.body.parts : []).map((x) => ({ PartNumber: Number(x?.PartNumber), ETag: String(x?.ETag || "") })).filter((x) => x.PartNumber > 0 && x.ETag);
    if (parts.length === 0) return res.status(400).json({ error: "No uploaded parts were reported." });
    const size = await r2CompleteUpload(p.storedName, p.uploadId, parts);
    r2Pending.delete(p.uploadId);
    const videoUrl = `/api/videos/${p.storedName}`;
    const previousUrl = (await db.getContentById(req.params.id))?.video_url;
    const updated = await db.uploadVideoForContent(
      req.params.id,
      { video_url: videoUrl, video_filename: p.filename, video_filesize: size },
      req.user
    );
    if (!updated) return res.status(404).json({ error: "Content not found" });
    removeReplacedFile(previousUrl);
    res.json({ success: true, content: updated, file: { url: videoUrl, filename: p.filename, size } });
  }));
  app.post("/api/content/:id/r2-upload/abort", uploadGuard, asyncHandler(async (req, res) => {
    const p = r2PendingFor(req);
    if (p) {
      r2Pending.delete(p.uploadId);
      await r2AbortUpload(p.storedName, p.uploadId).catch(() => {
      });
    }
    res.json({ success: true });
  }));
  app.post("/api/content/:id/attach-sample-video", asyncHandler(async (req, res) => {
    if (!canManageContent(req.user.role)) {
      return res.status(403).json({ error: "Only Admins and Managers can attach demo sample videos." });
    }
    const samples = ["sample-reel-1.mp4", "sample-reel-2.mp4", "sample-reel-3.mp4", "sample-reel-4.mp4"].filter((f) => import_fs7.default.existsSync(import_path5.default.join(UPLOADS_DIR, f)));
    if (samples.length === 0) return res.status(404).json({ error: "No sample videos found in /uploads" });
    const chosen = samples[Math.floor(Math.random() * samples.length)];
    const fileSize = import_fs7.default.statSync(import_path5.default.join(UPLOADS_DIR, chosen)).size;
    const videoUrl = `/api/videos/${chosen}`;
    const updated = await db.uploadVideoForContent(
      req.params.id,
      { video_url: videoUrl, video_filename: chosen, video_filesize: fileSize },
      req.user
    );
    if (!updated) return res.status(404).json({ error: "Content not found" });
    res.json({ success: true, content: updated, file: { url: videoUrl, filename: chosen, size: fileSize } });
  }));
  app.post("/api/content/:id/mark-posted", asyncHandler(async (req, res) => {
    const currentUser = req.user;
    const item = await db.getContentById(req.params.id);
    if (!item || !canViewContent(currentUser, item)) {
      return res.status(404).json({ error: "Content not found" });
    }
    if (!canMarkPosted(currentUser, item)) {
      return res.status(403).json({ error: "Only the assigned Intern (or an Admin/Manager) can mark this as posted." });
    }
    if (item.status === "POSTED") {
      return res.status(409).json({ error: "This content is already marked as Posted.", content: item });
    }
    if (!canManageContent(currentUser.role) && item.status !== "READY_TO_POST") {
      return res.status(400).json({ error: "This content is not Ready to Post yet \u2014 the final file has not been uploaded." });
    }
    const { post_url, posted_at, posting_notes, platform } = req.body || {};
    if (post_url && !/^https?:\/\//i.test(String(post_url))) {
      return res.status(400).json({ error: "Post URL must start with http:// or https://" });
    }
    if (platform && !PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: "Unknown platform" });
    }
    const result = await db.markContentAsPosted(
      req.params.id,
      { post_url, posted_at, posting_notes, platform },
      currentUser
    );
    if (result.alreadyPosted) {
      return res.status(409).json({ error: "This content is already marked as Posted.", content: result.item });
    }
    if (!result.item) return res.status(404).json({ error: "Content not found" });
    res.json({ success: true, content: result.item });
  }));
  app.post("/api/content/:id/revision", asyncHandler(async (req, res) => {
    if (!canManageContent(req.user.role)) {
      return res.status(403).json({ error: "Only Admins and Managers can request revisions." });
    }
    const notes = String(req.body?.notes || "").trim();
    if (!notes) return res.status(400).json({ error: "Revision notes are required" });
    const item = await db.getContentById(req.params.id);
    if (!item) return res.status(404).json({ error: "Content not found" });
    if (item.status === "POSTED") {
      return res.status(400).json({ error: "Posted content cannot be sent for revision. Reopen it first by editing its status." });
    }
    const updated = await db.requestRevision(req.params.id, notes, req.user);
    res.json({ success: true, content: updated });
  }));
  app.post("/api/content/:id/report-issue", asyncHandler(async (req, res) => {
    const item = await db.getContentById(req.params.id);
    if (!item || !canViewContent(req.user, item)) {
      return res.status(404).json({ error: "Content not found" });
    }
    const { issue_type } = req.body || {};
    const description = String(req.body?.description || "").trim();
    if (!issue_type || !ISSUE_TYPES.includes(issue_type)) {
      return res.status(400).json({ error: "Please choose an issue type" });
    }
    const issue = await db.reportIssue({ content_id: req.params.id, issue_type, description }, req.user);
    res.status(201).json({ success: true, issue });
  }));
  app.post("/api/content/:id/duplicate", asyncHandler(async (req, res) => {
    if (!canManageContent(req.user.role)) {
      return res.status(403).json({ error: "Only Admins and Managers can duplicate content." });
    }
    const duplicate = await db.duplicateContent(req.params.id, req.user);
    if (!duplicate) return res.status(404).json({ error: "Content not found" });
    res.status(201).json({ success: true, content: duplicate });
  }));
  app.delete("/api/content/:id", asyncHandler(async (req, res) => {
    if (!canDeleteContent(req.user.role)) {
      return res.status(403).json({ error: "Only Admins can delete content." });
    }
    const success = await db.deleteContent(req.params.id, req.user);
    if (!success) return res.status(404).json({ error: "Content not found" });
    res.json({ success: true });
  }));
  app.get("/api/issues", asyncHandler(async (req, res) => {
    const { content_id } = req.query;
    res.json({ issues: await db.getIssues(content_id, req.user) });
  }));
  app.patch("/api/issues/:id/resolve", asyncHandler(async (req, res) => {
    if (!canManageContent(req.user.role)) {
      return res.status(403).json({ error: "Only Admins and Managers can resolve issues." });
    }
    const resolved = await db.resolveIssue(req.params.id, req.user);
    if (!resolved) return res.status(404).json({ error: "Issue not found" });
    res.json({ success: true, issue: resolved });
  }));
  app.get("/api/activity", asyncHandler(async (req, res) => {
    const { content_id, limit, since } = req.query;
    if (content_id) {
      const item = await db.getContentById(String(content_id));
      if (!item || !canViewContent(req.user, item)) return res.json({ activity_logs: [] });
    }
    res.json({
      activity_logs: await db.getActivityLogs(
        content_id,
        limit ? parseInt(limit, 10) : 100,
        req.user,
        since ? String(since) : void 0
      )
    });
  }));
  app.post("/api/popups/missed", asyncHandler(async (req, res) => {
    try {
      res.json(await db.takeMissedPopups(req.user));
    } catch (err) {
      console.warn(`\u26A0\uFE0F  Missed pop-ups unavailable: ${err.message}`);
      res.json({ now: (/* @__PURE__ */ new Date()).toISOString(), items: [] });
    }
  }));
  app.post("/api/popups/seen", asyncHandler(async (req, res) => {
    const kind = req.body?.kind === "activity" ? "activity" : "notification";
    const id = String(req.body?.id || "");
    if (id) await db.markPopupSeen(req.user.id, kind, id).catch(() => {
    });
    res.json({ success: true });
  }));
  app.get("/api/notifications", asyncHandler(async (req, res) => {
    res.json({ notifications: await db.getNotifications(req.user.id) });
  }));
  app.patch("/api/notifications/:id/read", asyncHandler(async (req, res) => {
    const success = await db.markNotificationAsRead(req.params.id, req.user.id);
    res.json({ success });
  }));
  app.post("/api/notifications/read-all", asyncHandler(async (req, res) => {
    await db.markAllNotificationsAsRead(req.user.id);
    res.json({ success: true });
  }));
  app.get("/api/settings", asyncHandler(async (_req, res) => {
    const settings = await db.getSettings();
    res.json({
      settings,
      now: nowInTimezone(settings.default_timezone)
    });
  }));
  app.patch("/api/settings", asyncHandler(async (req, res) => {
    if (!canManageTeam(req.user.role)) {
      return res.status(403).json({ error: "Only Admins can change workspace settings." });
    }
    const body = req.body || {};
    const updates = {};
    if (body.workspace_name !== void 0) {
      const name = String(body.workspace_name).trim();
      if (!name) return res.status(400).json({ error: "Workspace name cannot be empty" });
      updates.workspace_name = name.slice(0, 80);
    }
    if (body.default_timezone !== void 0) {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: String(body.default_timezone) });
      } catch {
        return res.status(400).json({ error: "Unknown timezone" });
      }
      updates.default_timezone = String(body.default_timezone);
    }
    if (body.default_platform !== void 0) {
      if (!PLATFORMS.includes(body.default_platform)) return res.status(400).json({ error: "Unknown platform" });
      updates.default_platform = body.default_platform;
    }
    if (body.allow_editor_replace !== void 0) updates.allow_editor_replace = Boolean(body.allow_editor_replace);
    if (body.notification_email !== void 0) updates.notification_email = Boolean(body.notification_email);
    if (body.auto_cleanup_enabled !== void 0) updates.auto_cleanup_enabled = Boolean(body.auto_cleanup_enabled);
    if (body.retention_days !== void 0) {
      const days = Number(body.retention_days);
      if (!isNaN(days) && days >= 1 && days <= 730) {
        updates.retention_days = Math.round(days);
      }
    }
    const updated = await db.updateSettings(updates);
    await db.logActivity({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: "settings_updated",
      description: `${req.user.name} updated workspace settings.`
    });
    res.json({ settings: updated });
  }));
  app.get("/api/settings/storage-stats", asyncHandler(async (req, res) => {
    const settings = await db.getSettings();
    const stats = await getStorageUsageStats(settings.retention_days || 90);
    res.json(stats);
  }));
  app.post("/api/settings/cleanup", asyncHandler(async (req, res) => {
    if (!canManageTeam(req.user.role)) {
      return res.status(403).json({ error: "Only Admins can trigger storage cleanup." });
    }
    const settings = await db.getSettings();
    const days = req.body?.retention_days ? Number(req.body.retention_days) : settings.retention_days || 90;
    const result = await runStorageLifecycleCleanup(days);
    await db.logActivity({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: "storage_cleanup",
      description: `${req.user.name} triggered manual storage cleanup. Freed ${(result.bytesFreed / (1024 * 1024)).toFixed(2)} MB across ${result.filesDeleted} files.`
    });
    res.json(result);
  }));
  async function resolveFileForUser(req, res) {
    const sanitized = import_path5.default.basename(req.params.filename);
    const localPath = import_path5.default.join(UPLOADS_DIR, sanitized);
    const isLocal = import_fs7.default.existsSync(localPath) && import_fs7.default.statSync(localPath).isFile();
    if (!isLocal && !r2Enabled()) {
      res.status(404).json({ error: "File not found" });
      return null;
    }
    const filePath = isLocal ? localPath : null;
    const matches = await db.getContentList({ visibleTo: req.user });
    const content = matches.find((c) => c.video_url === `/api/videos/${sanitized}`);
    if (!content && !isManagerial(req.user.role)) {
      res.status(404).json({ error: "File not found" });
      return null;
    }
    return { filePath, storedName: sanitized, content };
  }
  app.get("/api/videos/:filename/download", asyncHandler(async (req, res) => {
    const resolved = await resolveFileForUser(req, res);
    if (!resolved) return;
    const { filePath, storedName, content } = resolved;
    if (content) {
      await db.logActivity({
        content_id: content.id,
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: "downloaded_video",
        description: `${req.user.name} downloaded ${content.video_filename || storedName}.`
      });
    }
    const downloadName = content?.video_filename || storedName;
    if (!filePath) {
      const ext = import_path5.default.extname(storedName).toLowerCase();
      return res.redirect(302, await r2FileUrl(storedName, { downloadName, contentType: MIME_BY_EXT[ext] }));
    }
    res.download(filePath, downloadName, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: "Failed to download the file. Please retry." });
      }
    });
  }));
  app.get("/api/videos/:filename", asyncHandler(async (req, res) => {
    const resolved = await resolveFileForUser(req, res);
    if (!resolved) return;
    const { filePath, storedName } = resolved;
    if (!filePath) {
      const ext = import_path5.default.extname(storedName).toLowerCase();
      res.setHeader("Cache-Control", "private, max-age=600");
      return res.redirect(302, await r2FileUrl(storedName, { contentType: MIME_BY_EXT[ext] || "application/octet-stream" }));
    }
    const fileSize = import_fs7.default.statSync(filePath).size;
    const mimeType = MIME_BY_EXT[import_path5.default.extname(filePath).toLowerCase()] || "application/octet-stream";
    const range = req.headers.range;
    res.setHeader("Cache-Control", "private, max-age=3600");
    if (range && /^bytes=\d*-\d*$/.test(range)) {
      const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
      let start = startStr ? parseInt(startStr, 10) : 0;
      let end = endStr ? parseInt(endStr, 10) : fileSize - 1;
      if (!startStr && endStr) {
        start = Math.max(0, fileSize - parseInt(endStr, 10));
        end = fileSize - 1;
      }
      end = Math.min(end, fileSize - 1);
      if (start > end || start >= fileSize) {
        res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
        return res.end();
      }
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": mimeType
      });
      import_fs7.default.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": mimeType,
        "Accept-Ranges": "bytes"
      });
      import_fs7.default.createReadStream(filePath).pipe(res);
    }
  }));
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  app.use((err, req, res, next) => {
    if (!req.path.startsWith("/api")) return next(err);
    console.error("API error:", err);
    if (res.headersSent) return;
    res.status(500).json({ error: "Something went wrong on the server. Please try again." });
  });
  const distPath = import_path5.default.join(process.cwd(), "dist");
  const hasBuiltFrontend = import_fs7.default.existsSync(import_path5.default.join(distPath, "index.html"));
  if (process.env.NODE_ENV === "production" || hasBuiltFrontend) {
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path5.default.join(distPath, "index.html"));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite dev middleware not available, falling back to static:", e);
      app.use(import_express.default.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(import_path5.default.join(distPath, "index.html"));
      });
    }
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ContentFlow server running on http://localhost:${PORT}`);
    startStorageLifecycleScheduler();
  });
}
startServer().catch((err) => {
  console.error("Failed to start ContentFlow server:", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
