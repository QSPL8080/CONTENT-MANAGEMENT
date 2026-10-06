import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { db, SessionInfo, nowInTimezone } from './server/db';
import { SAMPLE_CALENDAR_ITEMS } from './server/sampleData';
import {
  SESSION_COOKIE,
  SESSION_TTL_DAYS,
  readCookie,
  setSessionCookie,
  clearSessionCookie,
  newSessionToken,
  hashToken,
  tooManyAttempts,
  recordFailedAttempt,
  clearAttempts,
} from './server/auth';
import {
  isManagerial,
  canManageContent,
  canDeleteContent,
  canManageTeam,
  canEditTeamInfo,
  ADMIN_EDITABLE_ROLES,
  isCreator,
  isPoster,
  isValidRole,
  assignableRoles,
  roleLabel,
} from './src/lib/roles';
import type { ContentItem, ContentStatus, User, Platform } from './src/types';

const PORT = Number(process.env.PORT || 3000);
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
// Express request augmented with the signed-in user
interface AuthedRequest extends Request {
  user: User;
  session: SessionInfo & { tokenHash: string };
}

const CONTENT_STATUSES: ContentStatus[] = ['PLANNED', 'EDITING', 'READY_TO_POST', 'POSTED', 'REVISION', 'ISSUE'];
const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'youtube_shorts', 'linkedin', 'x', 'facebook'];
const ISSUE_TYPES = [
  'video_not_downloading', 'wrong_video', 'caption_issue', 'video_editing_problem',
  'platform_issue', 'cannot_publish', 'other',
];

// ---------------------------------------------------------------------------
// Final asset uploads (videos for Video Editors, images/PDF/ZIP for Graphic Designers)
// ---------------------------------------------------------------------------
const VIDEO_EXTENSIONS = [
  '.mp4', '.mov', '.webm', '.m4v', '.mkv',
  '.avi', '.wmv', '.flv', '.3gp', '.ts',
  '.mts', '.m2ts', '.ogv', '.ogg', '.qt',
];
const DESIGN_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.zip'];
const ALLOWED_EXTENSIONS = [...VIDEO_EXTENSIONS, ...DESIGN_EXTENSIONS];

const MIME_BY_EXT: Record<string, string> = {
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime', '.qt': 'video/quicktime',
  '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo', '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv', '.3gp': 'video/3gpp', '.ts': 'video/mp2t', '.mts': 'video/mp2t', '.m2ts': 'video/mp2t',
  '.ogv': 'video/ogg', '.ogg': 'video/ogg',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.pdf': 'application/pdf', '.zip': 'application/zip',
};

function safeStoredName(originalName: string) {
  const ext = path.extname(originalName).toLowerCase() || '.mp4';
  const cleanBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'file';
  const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  return `${cleanBase}-${unique}${ext}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => cb(null, safeStoredName(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type "${ext || 'unknown'}". Allowed: videos (MP4, MOV, WEBM…), images (JPG, PNG, WEBP, GIF), PDF or ZIP.`));
    }
  },
});

const TEMP_UPLOADS_DIR = path.join(UPLOADS_DIR, 'temp_chunks');
if (!fs.existsSync(TEMP_UPLOADS_DIR)) {
  fs.mkdirSync(TEMP_UPLOADS_DIR, { recursive: true });
}

const chunkStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const rawUploadId = req.query.uploadId || req.body?.uploadId || 'chunk';
    const uploadId = String(rawUploadId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const dir = path.join(TEMP_UPLOADS_DIR, uploadId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, _file, cb) => {
    const rawChunkIndex = req.query.chunkIndex !== undefined ? req.query.chunkIndex : req.body?.chunkIndex;
    const chunkIndex = parseInt(String(rawChunkIndex), 10) || 0;
    cb(null, `part-${chunkIndex}`);
  },
});

const uploadChunk = multer({
  storage: chunkStorage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB per chunk
});

// ---------------------------------------------------------------------------
// Permission helpers (single source of truth — SRS §3.4, enforced server-side)
// ---------------------------------------------------------------------------
function canViewContent(user: User, item: ContentItem) {
  return isManagerial(user.role) || item.editor_id === user.id || item.poster_id === user.id;
}

async function canUploadFinal(user: User, item: ContentItem): Promise<string | null> {
  if (canManageContent(user.role)) return null;
  if (user.role === 'super_admin') return 'The Super Admin account is for oversight — content is handled by Admins.';
  if (!isCreator(user.role) || item.editor_id !== user.id) {
    return 'Only the assigned Graphic Designer / Video Editor (or an Admin) can upload the final file.';
  }
  if (item.status === 'POSTED') return 'This content is already posted — the final file can no longer be replaced.';
  if (item.video_url) {
    const settings = await db.getSettings();
    if (!settings.allow_editor_replace) return 'Replacing an uploaded file is turned off in Settings. Ask an Admin.';
  }
  return null;
}

function canMarkPosted(user: User, item: ContentItem) {
  return canManageContent(user.role) || (isPoster(user.role) && item.poster_id === user.id);
}

const asyncHandler =
  (fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req as AuthedRequest, res, next)).catch(next);

function publicUser(u: User) {
  return u;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  await db.init();

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // -------------------------------------------------------------------------
  // Public endpoints
  // -------------------------------------------------------------------------
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/auth/config', asyncHandler(async (_req, res) => {
    const settings = await db.getSettings();
    res.json({ workspaceName: settings.workspace_name });
  }));

  async function startSession(req: Request, res: Response, user: User, method: 'password') {
    const { token, hash } = newSessionToken();
    await db.createSession(hash, user.id, method, SESSION_TTL_DAYS);
    setSessionCookie(req, res, token);
  }

  // Email + password sign-in. Only accounts the Super Admin has created (and given a password) can get in.
  app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const limiterKey = `pw:${req.ip}:${email}`;
    if (tooManyAttempts(limiterKey)) {
      return res.status(429).json({ error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' });
    }

    const user = await db.verifyUserPassword(email, password);
    if (!user) {
      recordFailedAttempt(limiterKey);
      const exists = await db.getUserByEmail(email);
      if (exists && !exists.password_hash) {
        return res.status(401).json({ error: 'Your password has not been set yet. Ask the Super Admin to set it.' });
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'This account has been deactivated. Contact the Super Admin.' });
    }
    clearAttempts(limiterKey);
    await startSession(req, res, user, 'password');
    await db.touchLastLogin(user.id);
    res.json({ success: true, user: publicUser(user) });
  }));

  app.post('/api/auth/logout', asyncHandler(async (req, res) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) await db.deleteSession(hashToken(token));
    clearSessionCookie(req, res);
    res.json({ success: true });
  }));

  // -------------------------------------------------------------------------
  // Authentication gate — every /api route below requires a valid session
  // (FR-AUTH-1, FR-AUTH-4). Video files are served under /api too, so they are protected.
  // -------------------------------------------------------------------------
  app.use('/api', asyncHandler(async (req, res, next) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });
    const tokenHash = hashToken(token);
    const session = await db.getSession(tokenHash);
    if (!session) {
      clearSessionCookie(req, res);
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    req.user = session.user;
    req.session = { ...session, tokenHash };

    next();
  }));

  // Any signed-in user changes their OWN password (needs the current one)
  app.post('/api/auth/change-password', asyncHandler(async (req, res) => {
    const user = req.session.realUser;
    const current = String(req.body?.current_password || '');
    const next = String(req.body?.new_password || '');
    const limiterKey = `chpw:${user.id}`;
    if (tooManyAttempts(limiterKey)) {
      return res.status(429).json({ error: 'Too many attempts. Please wait 15 minutes and try again.' });
    }
    if (!(await db.checkPassword(user.id, current))) {
      recordFailedAttempt(limiterKey);
      return res.status(400).json({ error: 'Your current password is not correct.' });
    }
    if (next.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    if (next === current) return res.status(400).json({ error: 'New password must be different from the current one.' });
    clearAttempts(limiterKey);
    const updated = await db.updateUser(user.id, { password: next, must_change_password: false });
    // Sign out this account everywhere else; keep the current device signed in
    await db.deleteSessionsForUser(user.id, req.session.tokenHash);
    await db.logActivity({
      user_id: user.id, user_name: user.name, user_role: user.role,
      action: 'password_changed',
      description: `${user.name} changed their password.`,
    });
    res.json({ success: true, user: updated });
  }));

  app.get('/api/auth/me', asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  }));

  // -------------------------------------------------------------------------
  // Users / Team (FR-TEAM-1, FR-TEAM-2)
  // -------------------------------------------------------------------------
  app.get('/api/users', asyncHandler(async (_req, res) => {
    res.json({ users: await db.getUsers() });
  }));

  app.post('/api/users', asyncHandler(async (req, res) => {
    const actor = req.user;
    if (!canManageTeam(actor.role)) {
      return res.status(403).json({ error: 'Only the Super Admin and Admins can add team members.' });
    }
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const role = req.body?.role;
    const password = req.body?.password ? String(req.body.password) : '';
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Name, email, and role are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (!isValidRole(role) || !assignableRoles(actor.role).includes(role)) {
      return res.status(403).json({ error: `You cannot create a ${roleLabel(role)} account.` });
    }
    if (await db.getUserByEmail(email)) {
      return res.status(409).json({ error: `${email} is already on the team.` });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Set a password of at least 8 characters for this member' });
    }
    const newUser = await db.createUser({ name, email, role, password, status: 'active' });
    await db.logActivity({
      user_id: actor.id, user_name: actor.name, user_role: actor.role,
      action: 'user_added',
      description: `${actor.name} added ${newUser.name} (${newUser.email}) as ${roleLabel(newUser.role)}.`,
    });
    res.status(201).json({ user: newUser });
  }));

  // Super Admin & Admin: see a member's CURRENT password (kept in sync when they change it). Logged.
  app.get('/api/users/:id/password', asyncHandler(async (req, res) => {
    if (!canManageTeam(req.user.role)) {
      return res.status(403).json({ error: 'Only the Super Admin and Admins can view passwords.' });
    }
    const target = await db.getUserById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    const password = await db.revealPassword(target.id);
    res.setHeader('Cache-Control', 'no-store');
    if (password === null) {
      return res.status(404).json({ error: 'This password cannot be shown. Set a new one with the edit button.' });
    }
    await db.logActivity({
      user_id: req.user.id, user_name: req.user.name, user_role: req.user.role,
      action: 'password_viewed',
      description: `${req.user.name} viewed ${target.name}'s password.`,
    });
    res.json({ password });
  }));

  app.patch('/api/users/:id', asyncHandler(async (req, res) => {
    const actor = req.user;
    if (!canManageTeam(actor.role)) {
      return res.status(403).json({ error: 'Only the Super Admin and Admins can edit team members.' });
    }
    const target = await db.getUserById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });

    const updates: Record<string, any> = {};
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: 'Name cannot be empty' });
      updates.name = name;
    }
    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
      }
      const clash = await db.getUserByEmail(email);
      if (clash && clash.id !== target.id) {
        return res.status(409).json({ error: `${email} is already used by ${clash.name}.` });
      }
      updates.email = email;
    }
    if (req.body.role !== undefined && req.body.role !== target.role) {
      const role = req.body.role;
      if (target.id === actor.id) {
        return res.status(400).json({ error: 'You cannot change your own role.' });
      }
      const allowed = assignableRoles(actor.role);
      if (!isValidRole(role) || !allowed.includes(role)) {
        return res.status(403).json({ error: `You cannot assign the ${roleLabel(role)} role.` });
      }
      updates.role = role;
    }
    if (req.body.status !== undefined && req.body.status !== target.status) {
      const status = req.body.status;
      if (status !== 'active' && status !== 'disabled') {
        return res.status(400).json({ error: 'Status must be active or disabled' });
      }
      if (target.id === actor.id && status === 'disabled') {
        return res.status(400).json({ error: 'You cannot disable your own account.' });
      }
      updates.status = status;
    }
    if (req.body.password) {
      const password = String(req.body.password);
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
      updates.password = password;
    }

    // Never leave the workspace without an active Super Admin
    const losingSuperAdmin =
      target.role === 'super_admin' &&
      ((updates.role && updates.role !== 'super_admin') || updates.status === 'disabled');
    if (losingSuperAdmin && (await db.countActiveSuperAdmins(target.id)) === 0) {
      return res.status(400).json({ error: 'There must always be at least one active Super Admin.' });
    }

    const updated = await db.updateUser(target.id, updates);
    if (!updated) return res.status(404).json({ error: 'User not found' });

    if (updates.status === 'disabled' || (updates.password && target.id !== actor.id)) {
      await db.deleteSessionsForUser(target.id); // signed out everywhere immediately
    }

    const changes: string[] = [];
    if (updates.role) changes.push(`role → ${roleLabel(updates.role)}`);
    if (updates.status) changes.push(updates.status === 'disabled' ? 'deactivated the account' : 'activated the account');
    if (updates.email) changes.push(`email → ${updates.email}`);
    if (updates.name) changes.push(`name → ${updates.name}`);
    if (updates.password) changes.push('set a new password');
    if (changes.length) {
      await db.logActivity({
        user_id: actor.id, user_name: actor.name, user_role: actor.role,
        action: 'user_updated',
        description: `${actor.name} updated ${target.name}: ${changes.join(', ')}.`,
      });
    }
    res.json({ user: updated });
  }));

  // -------------------------------------------------------------------------
  // Metrics (scoped to the viewer)
  // -------------------------------------------------------------------------
  app.get('/api/metrics', asyncHandler(async (req, res) => {
    res.json(await db.getOperationalMetrics(req.user));
  }));

  // -------------------------------------------------------------------------
  // Content (FR-AUTH-3: Creators/Interns only ever receive content assigned to them)
  // -------------------------------------------------------------------------
  app.get('/api/content', asyncHandler(async (req, res) => {
    const { status, editor_id, poster_id, platform, date, search } = req.query;
    const items = await db.getContentList({
      status: status as string,
      editor_id: editor_id as string,
      poster_id: poster_id as string,
      platform: platform as string,
      date: date as string,
      search: search as string,
      visibleTo: req.user,
    });
    res.json({ content: items });
  }));

  app.get('/api/content/:id', asyncHandler(async (req, res) => {
    const item = await db.getContentById(req.params.id);
    if (!item || !canViewContent(req.user, item)) {
      return res.status(404).json({ error: 'Content item not found' });
    }
    const logs = await db.getActivityLogs(item.id, 200);
    const issues = await db.getIssues(item.id);
    res.json({ content: item, activity_logs: logs, issues });
  }));

  async function validateAssignees(editorId?: string, posterId?: string): Promise<string | null> {
    if (editorId) {
      const ed = await db.getUserById(editorId);
      if (!ed || ed.status !== 'active') return 'The selected Graphic Designer / Video Editor is not an active team member.';
    }
    if (posterId) {
      const po = await db.getUserById(posterId);
      if (!po || po.status !== 'active') return 'The selected Intern is not an active team member.';
    }
    return null;
  }

  app.post('/api/content', asyncHandler(async (req, res) => {
    const currentUser = req.user;
    if (!canManageContent(currentUser.role)) {
      return res.status(403).json({ error: 'Only Admins can create content. The Super Admin account is for oversight.' });
    }

    const {
      title, description, content_type, platform, scheduled_date, scheduled_time,
      editor_id, poster_id, caption, hashtags, instructions, reference_notes,
      internal_notes, tags, category,
    } = req.body;

    if (!title || !scheduled_date || !scheduled_time || !editor_id || !poster_id) {
      return res.status(400).json({
        error: 'Title, scheduled date, scheduled time, creator (designer/editor), and intern are required',
      });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date) || !/^\d{2}:\d{2}/.test(scheduled_time)) {
      return res.status(400).json({ error: 'Invalid scheduled date or time' });
    }
    if (platform && !PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: 'Unknown platform' });
    }
    const assigneeError = await validateAssignees(editor_id, poster_id);
    if (assigneeError) return res.status(400).json({ error: assigneeError });

    const newItem = await db.createContent(
      {
        title: String(title).trim(),
        description: description || '',
        content_type: content_type || 'reel',
        platform: platform || (await db.getSettings()).default_platform || 'instagram',
        category: category || 'Education',
        scheduled_date,
        scheduled_time: String(scheduled_time).slice(0, 5),
        editor_id,
        poster_id,
        caption: caption || '',
        hashtags: hashtags || '',
        instructions: instructions || '',
        reference_notes,
        internal_notes,
        tags: Array.isArray(tags) ? tags.map(String).filter(Boolean) : [],
        status: 'PLANNED',
        created_by: currentUser.id,
      },
      currentUser
    );

    res.status(201).json({ content: newItem });
  }));

  // Fields an assigned Graphic Designer / Video Editor may change
  const CREATOR_EDITABLE = ['status', 'editor_notes'];

  app.patch('/api/content/:id', asyncHandler(async (req, res) => {
    const currentUser = req.user;
    const existing = await db.getContentById(req.params.id);
    if (!existing || !canViewContent(currentUser, existing)) {
      return res.status(404).json({ error: 'Content not found' });
    }
    const body = req.body || {};
    const attempted = Object.keys(body);

    if (currentUser.role === 'super_admin') {
      return res.status(403).json({ error: 'The Super Admin account is for oversight — content is edited by Admins.' });
    }
    if (canManageContent(currentUser.role)) {
      if (body.status !== undefined && !CONTENT_STATUSES.includes(body.status)) {
        return res.status(400).json({ error: 'Unknown status' });
      }
      if (body.platform !== undefined && !PLATFORMS.includes(body.platform)) {
        return res.status(400).json({ error: 'Unknown platform' });
      }
      if (body.scheduled_date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(body.scheduled_date)) {
        return res.status(400).json({ error: 'Invalid scheduled date' });
      }
      if (body.scheduled_time !== undefined) {
        if (!/^\d{2}:\d{2}/.test(body.scheduled_time)) return res.status(400).json({ error: 'Invalid scheduled time' });
        body.scheduled_time = String(body.scheduled_time).slice(0, 5);
      }
      if (body.title !== undefined && !String(body.title).trim()) {
        return res.status(400).json({ error: 'Title cannot be empty' });
      }
      const assigneeError = await validateAssignees(
        body.editor_id !== existing.editor_id ? body.editor_id : undefined,
        body.poster_id !== existing.poster_id ? body.poster_id : undefined
      );
      if (assigneeError) return res.status(400).json({ error: assigneeError });
      // System-managed fields are set by their own workflows only
      for (const f of ['video_url', 'video_filename', 'video_filesize', 'video_uploaded_at', 'video_uploaded_by', 'posted_by', 'created_by']) {
        delete body[f];
      }
      if (body.status === 'POSTED' && existing.status !== 'POSTED') {
        return res.status(400).json({ error: 'Use "Mark as Posted" so the posting details are recorded.' });
      }
    } else if (isCreator(currentUser.role) && existing.editor_id === currentUser.id) {
      const violations = attempted.filter(f => !CREATOR_EDITABLE.includes(f));
      if (violations.length > 0) {
        return res.status(403).json({
          error: `${roleLabel(currentUser.role)}s cannot change ${violations.join(', ')}. Ask an Admin.`,
        });
      }
      if (body.status !== undefined) {
        // A creator may only start work (Planned/Revision/Issue → Editing)
        if (body.status !== 'EDITING' || !['PLANNED', 'REVISION', 'ISSUE', 'EDITING'].includes(existing.status)) {
          return res.status(403).json({ error: 'You can only move your own task to "Editing". Uploading the final file moves it to Ready to Post.' });
        }
      }
    } else {
      return res.status(403).json({
        error: isPoster(currentUser.role)
          ? 'Interns cannot edit content. Use "Mark as Posted" or "Report Issue".'
          : 'You are not assigned to this content.',
      });
    }

    const updated = await db.updateContent(req.params.id, body, currentUser);
    if (!updated) return res.status(404).json({ error: 'Content not found' });
    res.json({ content: updated });
  }));

  // Demo calendar (Admins only)
  app.post('/api/content/seed-instagram-calendar', asyncHandler(async (req, res) => {
    if (!canManageContent(req.user.role)) {
      return res.status(403).json({ error: 'Only Admins can load demo content.' });
    }
    const users = (await db.getUsers()).filter(u => u.status === 'active');
    const admin = req.user;
    const editor = users.find(u => isCreator(u.role)) || admin;
    const poster = users.find(u => isPoster(u.role)) || admin;

    const existingList = await db.getContentList({});
    const existingKeys = new Set(existingList.map(c => `${c.title}-${c.scheduled_date}`));
    let addedCount = 0;

    for (const item of SAMPLE_CALENDAR_ITEMS) {
      if (!existingKeys.has(`${item.title}-${item.scheduled_date}`)) {
        await db.createContent({
          ...item,
          editor_id: editor.id,
          poster_id: poster.id,
          created_by: admin.id,
          tags: ['instagram', item.category.toLowerCase()],
        } as any, admin);
        addedCount++;
      }
    }
    res.json({ success: true, addedCount });
  }));

  // -------------------------------------------------------------------------
  // Final file upload (direct + chunked). Permission is checked BEFORE the file is stored.
  // -------------------------------------------------------------------------
  const uploadGuard = asyncHandler(async (req, res, next) => {
    const item = await db.getContentById(req.params.id);
    if (!item || !canViewContent(req.user, item)) {
      return res.status(404).json({ error: 'Content not found' });
    }
    const denied = await canUploadFinal(req.user, item);
    if (denied) return res.status(403).json({ error: denied });
    next();
  });

  app.post('/api/content/:id/upload-video', uploadGuard, (req: Request, res: Response) => {
    upload.single('video')(req, res, async (err: any) => {
      try {
        if (err) {
          if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File size exceeds the 500MB limit.' });
          }
          return res.status(400).json({ error: err.message || 'Failed to process the uploaded file' });
        }
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file provided' });

        const videoUrl = `/api/videos/${file.filename}`;
        const updated = await db.uploadVideoForContent(
          req.params.id,
          { video_url: videoUrl, video_filename: file.originalname, video_filesize: file.size },
          (req as AuthedRequest).user
        );
        if (!updated) return res.status(404).json({ error: 'Content not found' });

        res.json({ success: true, content: updated, file: { url: videoUrl, filename: file.originalname, size: file.size } });
      } catch (e: any) {
        console.error('Upload handling failed:', e);
        res.status(500).json({ error: 'Upload failed on the server. Please try again.' });
      }
    });
  });

  app.post('/api/content/:id/upload-chunk', uploadGuard, (req: Request, res: Response) => {
    uploadChunk.single('chunk')(req, res, async (err: any) => {
      if (err) {
        return res.status(400).json({ error: `Chunk upload error: ${err.message}` });
      }

      const uploadId = req.query.uploadId || req.body?.uploadId;
      const chunkIndex = req.query.chunkIndex !== undefined ? req.query.chunkIndex : req.body?.chunkIndex;
      const totalChunks = req.query.totalChunks || req.body?.totalChunks;
      const filename = req.query.filename || req.body?.filename;
      const filesize = req.query.filesize || req.body?.filesize;
      const contentId = req.params.id;

      if (!uploadId || chunkIndex === undefined || !totalChunks || !filename) {
        return res.status(400).json({ error: 'Missing chunk metadata (uploadId, chunkIndex, totalChunks, filename)' });
      }
      const ext = path.extname(String(filename)).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return res.status(400).json({ error: `Unsupported file type "${ext || 'unknown'}".` });
      }

      const cleanUploadId = String(uploadId).replace(/[^a-zA-Z0-9_-]/g, '_');
      const chunkIdx = parseInt(String(chunkIndex), 10);
      const total = parseInt(String(totalChunks), 10);
      const chunkDir = path.join(TEMP_UPLOADS_DIR, cleanUploadId);

      if (chunkIdx + 1 < total) {
        return res.json({ success: true, chunkReceived: chunkIdx, total });
      }

      try {
        const uniqueName = safeStoredName(String(filename));
        const finalPath = path.join(UPLOADS_DIR, uniqueName);
        if (fs.existsSync(finalPath)) {
          try { fs.unlinkSync(finalPath); } catch {}
        }

        for (let i = 0; i < total; i++) {
          const partPath = path.join(chunkDir, `part-${i}`);
          if (!fs.existsSync(partPath)) throw new Error(`Missing chunk #${i + 1}`);
          fs.appendFileSync(finalPath, fs.readFileSync(partPath));
        }

        try {
          fs.rmSync(chunkDir, { recursive: true, force: true });
        } catch (rmErr) {
          console.error('Failed to cleanup temp chunk dir:', rmErr);
        }

        const stat = fs.statSync(finalPath);
        const videoUrl = `/api/videos/${uniqueName}`;
        const updated = await db.uploadVideoForContent(
          contentId,
          { video_url: videoUrl, video_filename: String(filename), video_filesize: stat.size || parseInt(String(filesize), 10) || 0 },
          (req as AuthedRequest).user
        );
        if (!updated) return res.status(404).json({ error: 'Content item not found' });

        return res.json({ success: true, content: updated, file: { url: videoUrl, filename, size: stat.size } });
      } catch (assembleErr: any) {
        console.error('Error assembling chunks:', assembleErr);
        return res.status(500).json({ error: `Failed to assemble the uploaded file: ${assembleErr.message}` });
      }
    });
  });

  // Demo sample clip (Super Admin only — so real tasks can't be "completed" with a sample)
  app.post('/api/content/:id/attach-sample-video', asyncHandler(async (req, res) => {
    if (!canManageContent(req.user.role)) {
      return res.status(403).json({ error: 'Only Admins and Managers can attach demo sample videos.' });
    }
    const samples = ['sample-reel-1.mp4', 'sample-reel-2.mp4', 'sample-reel-3.mp4', 'sample-reel-4.mp4']
      .filter(f => fs.existsSync(path.join(UPLOADS_DIR, f)));
    if (samples.length === 0) return res.status(404).json({ error: 'No sample videos found in /uploads' });
    const chosen = samples[Math.floor(Math.random() * samples.length)];
    const fileSize = fs.statSync(path.join(UPLOADS_DIR, chosen)).size;

    const videoUrl = `/api/videos/${chosen}`;
    const updated = await db.uploadVideoForContent(
      req.params.id,
      { video_url: videoUrl, video_filename: chosen, video_filesize: fileSize },
      req.user
    );
    if (!updated) return res.status(404).json({ error: 'Content not found' });
    res.json({ success: true, content: updated, file: { url: videoUrl, filename: chosen, size: fileSize } });
  }));

  // Mark as Posted (assigned Intern, or Admin/Manager) — FR-POST-4..6
  app.post('/api/content/:id/mark-posted', asyncHandler(async (req, res) => {
    const currentUser = req.user;
    const item = await db.getContentById(req.params.id);
    if (!item || !canViewContent(currentUser, item)) {
      return res.status(404).json({ error: 'Content not found' });
    }
    if (!canMarkPosted(currentUser, item)) {
      return res.status(403).json({ error: 'Only the assigned Intern (or an Admin/Manager) can mark this as posted.' });
    }
    if (item.status === 'POSTED') {
      return res.status(409).json({ error: 'This content is already marked as Posted.', content: item });
    }
    if (!canManageContent(currentUser.role) && item.status !== 'READY_TO_POST') {
      return res.status(400).json({ error: 'This content is not Ready to Post yet — the final file has not been uploaded.' });
    }
    const { post_url, posted_at, posting_notes, platform } = req.body || {};
    if (post_url && !/^https?:\/\//i.test(String(post_url))) {
      return res.status(400).json({ error: 'Post URL must start with http:// or https://' });
    }
    if (platform && !PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: 'Unknown platform' });
    }

    const result = await db.markContentAsPosted(
      req.params.id,
      { post_url, posted_at, posting_notes, platform },
      currentUser
    );
    if (result.alreadyPosted) {
      return res.status(409).json({ error: 'This content is already marked as Posted.', content: result.item });
    }
    if (!result.item) return res.status(404).json({ error: 'Content not found' });
    res.json({ success: true, content: result.item });
  }));

  // Revision request (Admin/Manager)
  app.post('/api/content/:id/revision', asyncHandler(async (req, res) => {
    if (!canManageContent(req.user.role)) {
      return res.status(403).json({ error: 'Only Admins and Managers can request revisions.' });
    }
    const notes = String(req.body?.notes || '').trim();
    if (!notes) return res.status(400).json({ error: 'Revision notes are required' });
    const item = await db.getContentById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Content not found' });
    if (item.status === 'POSTED') {
      return res.status(400).json({ error: 'Posted content cannot be sent for revision. Reopen it first by editing its status.' });
    }
    const updated = await db.requestRevision(req.params.id, notes, req.user);
    res.json({ success: true, content: updated });
  }));

  // Report Issue (anyone who can see the content)
  app.post('/api/content/:id/report-issue', asyncHandler(async (req, res) => {
    const item = await db.getContentById(req.params.id);
    if (!item || !canViewContent(req.user, item)) {
      return res.status(404).json({ error: 'Content not found' });
    }
    const { issue_type } = req.body || {};
    const description = String(req.body?.description || '').trim();
    if (!issue_type || !ISSUE_TYPES.includes(issue_type)) {
      return res.status(400).json({ error: 'Please choose an issue type' });
    }
    const issue = await db.reportIssue({ content_id: req.params.id, issue_type, description }, req.user);
    res.status(201).json({ success: true, issue });
  }));

  app.post('/api/content/:id/duplicate', asyncHandler(async (req, res) => {
    if (!canManageContent(req.user.role)) {
      return res.status(403).json({ error: 'Only Admins and Managers can duplicate content.' });
    }
    const duplicate = await db.duplicateContent(req.params.id, req.user);
    if (!duplicate) return res.status(404).json({ error: 'Content not found' });
    res.status(201).json({ success: true, content: duplicate });
  }));

  app.delete('/api/content/:id', asyncHandler(async (req, res) => {
    if (!canDeleteContent(req.user.role)) {
      return res.status(403).json({ error: 'Only Admins and Super Admins can delete content.' });
    }
    const success = await db.deleteContent(req.params.id, req.user);
    if (!success) return res.status(404).json({ error: 'Content not found' });
    res.json({ success: true });
  }));

  // -------------------------------------------------------------------------
  // Issues
  // -------------------------------------------------------------------------
  app.get('/api/issues', asyncHandler(async (req, res) => {
    const { content_id } = req.query;
    res.json({ issues: await db.getIssues(content_id as string, req.user) });
  }));

  app.patch('/api/issues/:id/resolve', asyncHandler(async (req, res) => {
    if (!canManageContent(req.user.role)) {
      return res.status(403).json({ error: 'Only Admins and Managers can resolve issues.' });
    }
    const resolved = await db.resolveIssue(req.params.id, req.user);
    if (!resolved) return res.status(404).json({ error: 'Issue not found' });
    res.json({ success: true, issue: resolved });
  }));

  // -------------------------------------------------------------------------
  // Activity logs (scoped)
  // -------------------------------------------------------------------------
  app.get('/api/activity', asyncHandler(async (req, res) => {
    const { content_id, limit } = req.query;
    if (content_id) {
      const item = await db.getContentById(String(content_id));
      if (!item || !canViewContent(req.user, item)) return res.json({ activity_logs: [] });
    }
    res.json({
      activity_logs: await db.getActivityLogs(
        content_id as string,
        limit ? parseInt(limit as string, 10) : 100,
        req.user
      ),
    });
  }));

  // -------------------------------------------------------------------------
  // Notifications (always the signed-in user's own)
  // -------------------------------------------------------------------------
  app.get('/api/notifications', asyncHandler(async (req, res) => {
    res.json({ notifications: await db.getNotifications(req.user.id) });
  }));

  app.patch('/api/notifications/:id/read', asyncHandler(async (req, res) => {
    const success = await db.markNotificationAsRead(req.params.id, req.user.id);
    res.json({ success });
  }));

  app.post('/api/notifications/read-all', asyncHandler(async (req, res) => {
    await db.markAllNotificationsAsRead(req.user.id);
    res.json({ success: true });
  }));

  // -------------------------------------------------------------------------
  // Settings (FR-SET-1)
  // -------------------------------------------------------------------------
  app.get('/api/settings', asyncHandler(async (_req, res) => {
    const settings = await db.getSettings();
    res.json({
      settings,
      now: nowInTimezone(settings.default_timezone),
    });
  }));

  app.patch('/api/settings', asyncHandler(async (req, res) => {
    if (!canManageTeam(req.user.role)) {
      return res.status(403).json({ error: 'Only the Super Admin and Admins can change workspace settings.' });
    }
    const body = req.body || {};
    const updates: Record<string, any> = {};
    if (body.workspace_name !== undefined) {
      const name = String(body.workspace_name).trim();
      if (!name) return res.status(400).json({ error: 'Workspace name cannot be empty' });
      updates.workspace_name = name.slice(0, 80);
    }
    if (body.default_timezone !== undefined) {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: String(body.default_timezone) });
      } catch {
        return res.status(400).json({ error: 'Unknown timezone' });
      }
      updates.default_timezone = String(body.default_timezone);
    }
    if (body.default_platform !== undefined) {
      if (!PLATFORMS.includes(body.default_platform)) return res.status(400).json({ error: 'Unknown platform' });
      updates.default_platform = body.default_platform;
    }
    if (body.allow_editor_replace !== undefined) updates.allow_editor_replace = Boolean(body.allow_editor_replace);
    if (body.notification_email !== undefined) updates.notification_email = Boolean(body.notification_email);
    const updated = await db.updateSettings(updates);
    await db.logActivity({
      user_id: req.user.id, user_name: req.user.name, user_role: req.user.role,
      action: 'settings_updated',
      description: `${req.user.name} updated workspace settings.`,
    });
    res.json({ settings: updated });
  }));

  // -------------------------------------------------------------------------
  // Final file streaming & download (signed-in + must be allowed to see the content)
  // -------------------------------------------------------------------------
  async function resolveFileForUser(req: AuthedRequest, res: Response): Promise<{ filePath: string; content?: ContentItem } | null> {
    const sanitized = path.basename(req.params.filename);
    const filePath = path.join(UPLOADS_DIR, sanitized);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.status(404).json({ error: 'File not found' });
      return null;
    }
    const matches = await db.getContentList({ visibleTo: req.user });
    const content = matches.find(c => c.video_url === `/api/videos/${sanitized}`);
    if (!content && !isManagerial(req.user.role)) {
      res.status(404).json({ error: 'File not found' });
      return null;
    }
    return { filePath, content };
  }

  app.get('/api/videos/:filename/download', asyncHandler(async (req, res) => {
    const resolved = await resolveFileForUser(req, res);
    if (!resolved) return;
    const { filePath, content } = resolved;

    if (content) {
      await db.logActivity({
        content_id: content.id,
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'downloaded_video',
        description: `${req.user.name} downloaded ${content.video_filename || path.basename(filePath)}.`,
      });
    }

    const downloadName = content?.video_filename || path.basename(filePath);
    res.download(filePath, downloadName, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: 'Failed to download the file. Please retry.' });
      }
    });
  }));

  // Streaming with HTTP Range support for video players / image preview
  app.get('/api/videos/:filename', asyncHandler(async (req, res) => {
    const resolved = await resolveFileForUser(req, res);
    if (!resolved) return;
    const { filePath } = resolved;

    const fileSize = fs.statSync(filePath).size;
    const mimeType = MIME_BY_EXT[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;

    res.setHeader('Cache-Control', 'private, max-age=3600');
    if (range && /^bytes=\d*-\d*$/.test(range)) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      let start = startStr ? parseInt(startStr, 10) : 0;
      let end = endStr ? parseInt(endStr, 10) : fileSize - 1;
      if (!startStr && endStr) { start = Math.max(0, fileSize - parseInt(endStr, 10)); end = fileSize - 1; }
      end = Math.min(end, fileSize - 1);
      if (start > end || start >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': mimeType,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  }));

  // Unknown API routes → JSON 404 (never the SPA HTML)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // JSON error handler for API routes
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith('/api')) return next(err);
    console.error('API error:', err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
  });

  // -------------------------------------------------------------------------
  // Frontend (Vite dev middleware, or built files in production)
  // -------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ContentFlow server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start ContentFlow server:', err);
  process.exit(1);
});
