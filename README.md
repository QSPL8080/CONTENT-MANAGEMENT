# ContentFlow — Quickupp Softech

Content calendar and publishing workflow: **Plan → Design/Edit → Upload → Ready to Post → Download → Publish → Mark Posted**.

## Roles

| Role | Sees | Can do |
|---|---|---|
| **Super Admin** | Everything | Everything, incl. managing Admins and "Preview as" any team member (read-only). Signs in with email + password. |
| **Admin** | Everything | Create/edit/delete content, assign work, request revisions, resolve issues, manage the team, settings. |
| **Manager** (DMM) | Everything | Same as Admin for content; can view the Team page but not change it or settings. |
| **Graphic Designer** | Only content assigned to them | Start work, upload the final creative (JPG/PNG/WEBP/GIF/PDF/ZIP or video), replace it before posting, add notes. |
| **Video Editor** | Only content assigned to them | Same as Graphic Designer, for videos. |
| **Intern** | Only posts assigned to them | Preview/download the final file, copy caption & hashtags, Mark as Posted (with link), report issues. |

Every rule is enforced on the server, not just hidden in the UI.

## Sign-in

* **Team members → "Continue with Google".** Only emails that are on the Team page (and Active) can get in. Anyone else is refused.
* **Super Admin → email + password** (the "Super Admin sign-in" section on the login screen).
* The team list from the SRS is added automatically on first start (`server/team.ts`). After that, manage people on the **Team** page: add, change role, fix an email, disable (signs them out immediately).
* **Manager (DMM):** no email yet — add it from Team → Managers → *Add Manager* when you have it.

## Setup

1. `npm install`
2. Copy the values you need from `.env.example` into `.env`:
   * `DATABASE_URL` — your PostgreSQL database. Tables are created/upgraded automatically on start.
   * `GOOGLE_CLIENT_ID` — see below.
   * `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — the Super Admin login (default `admin@cf.com` / `Admin@123`; **change it** after first sign-in on the Team page).
3. `npm run dev` → http://localhost:3000
   (production: `npm run build`, then set `NODE_ENV=production` and run `npm start`)

### Getting the Google Client ID

1. Go to https://console.cloud.google.com/ → create/select a project.
2. **APIs & Services → OAuth consent screen**: User type *External*, app name "ContentFlow", your support email. Publish it (or add each team Gmail as a test user).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → type **Web application**.
4. Under **Authorized JavaScript origins** add every address the app is opened from, e.g. `http://localhost:3000` and `https://your-domain.com`. (No redirect URI is needed.)
5. Copy the Client ID (`…apps.googleusercontent.com`) into `GOOGLE_CLIENT_ID` in `.env` and restart the server.

## Files changed for roles & Google sign-in

* `server/auth.ts` — sessions (httpOnly cookie), Google ID-token verification, login rate limiting
* `server/team.ts` — the team roster (Google allowlist seed)
* `server/db.ts` — schema auto-migration, role scoping, targeted notifications
* `server.ts` — every API route checks the signed-in user's role
* `src/lib/roles.ts` — role names, labels and permission helpers shared by server and app
* `src/components/LoginScreen.tsx`, `TeamManagement.tsx`, `SettingsView.tsx` — new/rebuilt screens
