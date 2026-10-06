# ContentFlow — Quickupp Softech

Content calendar and publishing workflow: **Plan → Design/Edit → Upload → Ready to Post → Download → Publish → Mark Posted**.

## Roles

| Role | Sees | Can do |
|---|---|---|
| **Super Admin** | Everything (view only) | Oversight account. Menu: **Dashboard, Manage Users, Activity, Settings**. Sees all content and its status on the Dashboard but does not create or edit content. The only one who adds/edits/disables users (Admins and Managers included), sees and resets passwords, and changes Settings. Cannot open or switch into other accounts. |
| **Admin** | Everything | Create/edit/delete content, calendar, assign work, request revisions, resolve issues. On the Team page can **edit name, email and role** of Managers, Designers, Editors and Interns — but cannot add, deactivate, see or change passwords, or edit Admins/Super Admin. No Settings. |
| **Manager** (DMM) | Everything | Same as Admin. |
| **Graphic Designer** | Only content assigned to them | Start work, upload the final creative (JPG/PNG/WEBP/GIF/PDF/ZIP or video), replace it before posting, add notes. |
| **Video Editor** | Only content assigned to them | Same as Graphic Designer, for videos. |
| **Intern** | Only posts assigned to them | Preview/download the final file, copy caption & hashtags, Mark as Posted (with link), report issues. |

Every rule is enforced on the server, not just hidden in the UI.

## Sign-in

* **Everyone signs in with email + password.** Only accounts the **Super Admin** has created (and kept Active) can sign in.
* **Super Admin:** `superadmin@gmail.com` / `content@1234`
* **Team members** from the SRS start with the password **`Quickupp@123`** (set `TEAM_DEFAULT_PASSWORD` in `.env` to use a different one before first start). A password that was already set is never overwritten.
* **Everyone can change their own password:** profile menu (top right) → **Change password** (needs the current password). Changing it signs that account out on every other device.
* The password the Super Admin sets is the person's password — there is no "temporary password" or forced change at sign-in.
* Forgot your password? The Super Admin sets a new one (Manage Users → ✏️ → Password).
* Team cards show only **Active** / **Deactivated**.
* **The Super Admin can see everyone's current password** on the Team page (👁 on each card), including passwords members chose themselves. Nobody else can. Every view is recorded in Activity. Passwords are stored encrypted with a key kept in `data/.vault-key` (created automatically; or set `PASSWORD_VAULT_KEY` in `.env`). **Back up that file** — without it, stored passwords can't be shown (sign-in still works and the Super Admin can set new ones).
* **One-time clean-up:** the first start of this version removes every account that is not the Super Admin or on the team list (e.g. the old `admin@cf.com`), resets all passwords to the ones below, and signs everyone out. It runs only once; later restarts never reset passwords.
* **Manager (DMM):** no email yet — the Super Admin adds it from Team → Managers → *Add Manager* (and sets the password there).

| Role | Name | Email | Password |
|---|---|---|---|
| Super Admin | Super Admin | superadmin@gmail.com | content@1234 |
| Admin | Quickupp CMO | quickuppsoftech.cmo@gmail.com | Quickupp@123 |
| Admin | Snehal Pawar | snehalpawar12014@gmail.com | Quickupp@123 |
| Graphic Designer | Devyani Ankush Bhoye | qs.graphicdesingner@gmail.com | Quickupp@123 |
| Graphic Designer | Rutuja Ganesh Pawar | qsgraphicdesigner2@gmail.com | Quickupp@123 |
| Graphic Designer | Swapnil Nawadkar | quickupp.graphicdesigns@gmail.com | Quickupp@123 |
| Video Editor | Ubaid Maner | dmquickuppsoftech@gmail.com | Quickupp@123 |
| Video Editor | Rahul Sanjay Mahajan | qs.photography0079@gmail.com | Quickupp@123 |
| Intern | Pratiksha Magatrao | qsdmintern01@gmail.com | Quickupp@123 |
| Intern | Tanisha Suresh Bangde | qsdmintern4@gmail.com | Quickupp@123 |
| Intern | Gayatri Ratnakar Sitafale | qsintern009@gmail.com | Quickupp@123 |
| Intern | Kiran B Arote | qsdmintern03@gmail.com | Quickupp@123 |

## Setup

1. `npm install`
2. In `.env`, the database line must be:
   ```
   DATABASE_URL=postgresql://postgres:8080@localhost:5432/content_management
   ```
   (Optional extras are listed in `.env.example`: `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `TEAM_DEFAULT_PASSWORD`, `PASSWORD_VAULT_KEY`.)
3. `npm run dev` → http://localhost:3000
   (production: `npm run build`, then set `NODE_ENV=production` and run `npm start`)
4. `npm run db:check` — shows the database name, every table with its row count, and all team accounts (never passwords).

On the first start the app **creates the `content_management` database by itself** (if it doesn't exist), creates all tables, the Super Admin and the team list. Nothing needs to be run in pgAdmin/psql.

### What is stored where (SRS §7)

| Table | Holds |
|---|---|
| `workspaces` | The workspace (one for now: Quickupp Softech) — ready for multi-brand later (SRS 7.5) |
| `users` | Team accounts: name, email, role, Active/Disabled, password (bcrypt hash + encrypted copy for the Super Admin) |
| `content_items` | Every content item: title, brief, type, platform, date/time, assigned designer/editor and intern, caption, hashtags, instructions, status, final file link + uploader + time, post URL + who/when posted, notes, tags |
| `activity_logs` | Full history in plain language (created, assigned, uploaded, downloaded, posted, rescheduled, password changes…) |
| `issues` | Reported problems: type, comment, who reported, open/resolved, who resolved and when |
| `notifications` | Each person's notifications and read/unread state |
| `settings` | Workspace name, timezone, default platform, permissions |
| `sessions` | Who is signed in (cleared on sign-out / disable / password change) |

Uploaded videos and designs are saved in the `uploads/` folder; the database stores the link to each file (as the SRS specifies).

## Files changed for roles & sign-in

* `server/auth.ts` — sessions (httpOnly cookie), login rate limiting
* `server/team.ts` — the team roster (seeded on first start)
* `server/db.ts` — creates the database + tables automatically, role scoping, targeted notifications
* `scripts/db-check.ts` — `npm run db:check`
* `server.ts` — every API route checks the signed-in user's role
* `src/lib/roles.ts` — role names, labels and permission helpers shared by server and app
* `src/components/LoginScreen.tsx`, `TeamManagement.tsx`, `SettingsView.tsx` — new/rebuilt screens
