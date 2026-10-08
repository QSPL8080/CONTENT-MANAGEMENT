# Quickupp Content Management System (ContentFlow)

A production-grade content calendar, asset management, and publishing workflow application designed for high-volume creative teams.

**Workflow Pipeline:**
`Plan & Schedule` ➔ `Assign Creator` ➔ `Design / Video Edit` ➔ `Chunked Upload` ➔ `Ready to Post` ➔ `Review & Download` ➔ `Publish to Platforms` ➔ `Mark as Posted with Live URL`

---

## 👥 Role & Permissions Matrix

All permissions are strictly enforced on the server via session-based authentication and role-scoping middleware.

| Role | Scope & Visibility | Capabilities |
|---|---|---|
| **Admin** | Full Platform & Content Operations | • Full Content Management: Create, edit, reschedule, and delete content tasks.<br>• Assign creatives to Designers, Video Editors, and Interns.<br>• Resolve reported issues and request revisions.<br>• Full User Management: Add, edit, activate/deactivate team members (Managers, Designers, Editors, Interns), and reset user passwords.<br>• View all content, calendar, analytics, and audit logs.<br>• Manage workspace settings and system configuration. |
| **Manager (DMM)** | Full Operations & Content Management | • Full Content Management: Create, edit, reschedule content tasks, assign team members, and resolve reported issues. |
| **Graphic Designer** | Assigned Work Only | • Dedicated "My Active Work" queue.<br>• Start tasks, view briefs, instructions, hashtags, and reference links.<br>• Upload final creatives (JPG, PNG, WEBP, GIF, PDF, ZIP) and replace assets before publishing.<br>• Direct "Fix & Re-upload" resolution flow for reported issues. |
| **Video Editor** | Assigned Work Only | • Dedicated "My Active Work" queue.<br>• High-speed chunked upload for large video files (MP4, MOV, MKV, etc.).<br>• Asset replacement, timeline notes, and direct "Fix & Re-upload" issue resolution. |
| **Intern (Poster)** | Assigned Publishing Queue Only | • Focused "Ready to Post" queue with upcoming and overdue alerts.<br>• One-click asset preview and download.<br>• One-click copy for captions, hashtags, and instructions with instant copy feedback.<br>• Mark tasks as Posted with live social media URL validation.<br>• Report issues (wrong asset, typo, corrupt file) back to creator and admins. |

---

## ⚡ Core Features

### 1. 📦 Resilient Large File & Chunked Upload
- Chunked multi-part upload pipeline capable of handling large video files (2–3+ GB) with real-time progress indicators.
- Automatically cleans up incomplete or abandoned upload chunks.

### 2. ⏳ Automated 90-Day Media Storage Lifecycle Policy
- Continuous background lifecycle service (`server/storageCleanup.ts`) runs every 24 hours.
- Automatically purges physical media files older than 90 days from the server filesystem (`uploads/`) to prevent unbounded disk usage while retaining post history, metadata, and live URLs in the database.
- Purges temporary chunk artifacts older than 24 hours.

### 3. 🔒 Session Security & Inactivity Auto-Logout
- **10-minute Inactivity Timer:** Automatically tracks user interactions (mouse, keyboard, scroll, touch) and warns users before auto-logging out to protect unattended workstations.
- **Remember Email:** Optional local storage flag to prefill email on sign-in screens.
- **Secure Password Vault:** Passwords encrypted using server vault keys; Admin audit logs track credential inspections.

### 4. 🔄 End-to-End Issue Resolution Workflow
- When an Intern flags an issue, the task status transitions to `ISSUE` and is surfaced with high priority in the assigned Graphic Designer's or Video Editor's dashboard with detailed issue notes and a 1-click **"Fix & Re-upload"** action.

---

## 👥 Initial Seeded Team Accounts

> **Note:** Initial team accounts are automatically provisioned in the database upon startup. Account passwords and roles can be managed directly by Admins via the Team Management interface.

| Role | Name | Email |
|---|---|---|
| **Admin** | Quickupp CMO | `quickuppsoftech.cmo@gmail.com` |
| **Admin** | Snehal Pawar | `snehalpawar12014@gmail.com` |
| **Graphic Designer** | Devyani Ankush Bhoye | `qs.graphicdesingner@gmail.com` |
| **Graphic Designer** | Rutuja Ganesh Pawar | `qsgraphicdesigner2@gmail.com` |
| **Graphic Designer** | Swapnil Nawadkar | `quickupp.graphicdesigns@gmail.com` |
| **Video Editor** | Ubaid Maner | `dmquickuppsoftech@gmail.com` |
| **Video Editor** | Rahul Sanjay Mahajan | `qs.photography0079@gmail.com` |
| **Intern** | Pratiksha Magatrao | `qsdmintern01@gmail.com` |
| **Intern** | Tanisha Suresh Bangde | `qsdmintern4@gmail.com` |
| **Intern** | Gayatri Ratnakar Sitafale | `qsintern009@gmail.com` |
| **Intern** | Kiran B Arote | `qsdmintern03@gmail.com` |

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js**: v18.x or higher
- **PostgreSQL**: v14.x or higher running locally or in the cloud

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create or verify your `.env` file in the project root:
```env
PORT=3000
DATABASE_URL=postgresql://<username>:<password>@localhost:5432/<database_name>
TEAM_DEFAULT_PASSWORD=<your_team_default_password>
```

> **Automated Database Setup:** On first start, the application automatically connects to PostgreSQL, creates the database if it does not exist, runs table migrations, and seeds initial users.

#### Using Supabase (same database on your PC and on the server)
1. Supabase → your project → **Connect** → **Session pooler** → copy the URI (works on IPv4 networks).
2. Put your database password into it and set it in `.env` on **both** your PC and the server:
   ```env
   DATABASE_URL=postgresql://postgres.<project-ref>:<db-password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   DB_POOL_MAX=5
   ```
3. Start the app — tables and team accounts are created automatically in Supabase.

Notes:
* SSL is turned on automatically for any database that is not `localhost` (`DATABASE_SSL=true|false` overrides). For full certificate checking, download Supabase's SSL certificate (Database settings → SSL) and set `DATABASE_SSL_CA=./data/supabase-ca.crt`.
* On hosted databases the app enables Row Level Security on its tables, so Supabase's public REST API cannot read them. The app itself is unaffected.
* Use the **same `data/.vault-key`** file on every machine that uses the database, otherwise saved passwords can't be shown.
* Uploaded files are stored in each machine's own `uploads/` folder, not in Supabase — files uploaded on the server won't open on your PC (and vice versa).

#### Moving to a new database — nothing is lost
When the app starts on a **new, empty** database it never falls back to old/default passwords if it can avoid it:
1. If `.env` has `PREVIOUS_DATABASE_URL` (the database you used before), **everything** is copied from it on first start — accounts with their current passwords, content, activity, issues, notifications, settings.
2. Otherwise, accounts are restored from `data/accounts-backup.json`, which the app rewrites every time an account is added or changed (password, name, role, Active/Deactivated).
3. Only if neither exists are the default team accounts created with `TEAM_DEFAULT_PASSWORD`.

Keep `data/accounts-backup.json` private (it is git-ignored). Use the same `data/.vault-key` everywhere so Admins can still view passwords.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production Build & Start
```bash
npm run build
npm start
```

### 5. Inspect Database
To check the database connection, table row counts, and team roster without exposing passwords:
```bash
npm run db:check
```

---

## 🗄️ Database Architecture

| Table | Purpose |
|---|---|
| `workspaces` | Multi-tenant workspace configuration and brand definitions. |
| `users` | User accounts, roles, active/deactivated status, and encrypted credential vault. |
| `content_items` | Content master table: briefs, platforms, dates, assignments, file paths, captions, hashtags, live URLs, and workflow statuses. |
| `activity_logs` | Audit trail of all actions (creations, assignments, uploads, downloads, publications, deletes, password changes). |
| `issues` | Issue tracking for flagged posts: issue reason, description, reporter, resolver, timestamps. |
| `notifications` | Targeted notifications per user for assignments, issue alerts, and status changes. |
| `settings` | Workspace metadata, default platforms, and retention policies. |
| `sessions` | Active user sessions with auto-invalidation on password reset or logout. |

---

## 📁 Key File Structure

```
├── server.ts                  # Express API server with authentication & route handlers
├── server/
│   ├── auth.ts                # Session management, bcrypt verification, rate limiting
│   ├── db.ts                  # PostgreSQL pool, schema initialization, auto-migration
│   ├── storageCleanup.ts      # 90-day automated storage cleanup lifecycle engine
│   └── team.ts                # Initial user roster and role seeding
├── src/
│   ├── App.tsx                # Main routing, role views, 10-minute inactivity watcher
│   ├── components/
│   │   ├── AdminDashboard.tsx      # Admin & Manager content hub
│   │   ├── EditorDashboard.tsx     # Graphic Designer & Video Editor workspace
│   │   ├── PosterDashboard.tsx     # Intern publishing queue
│   │   ├── ContentDetailModal.tsx  # Task inspection, editing, and deletion
│   │   ├── TeamManagement.tsx      # User management & credential admin
│   │   └── SettingsView.tsx        # System configuration
│   └── lib/
│       ├── api.ts             # Client API service & chunked upload handler
│       └── roles.ts           # Shared role definitions & permission rules
└── scripts/
    └── db-check.ts            # CLI database health & diagnostics tool
```
