import React, { useState } from 'react';
import { ActivityLog, User } from '../types';
import { UserAvatar } from './UserAvatar';
import { roleLabel } from '../lib/roles';
import {
  Activity,
  Filter,
  Clock,
  Search,
  Sparkles,
  UploadCloud,
  Download,
  Rocket,
  RotateCcw,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  X,
  Pencil,
  Copy,
  Trash2,
  UserPlus,
  UserX,
  UserCog,
  KeyRound,
  Eye,
  Settings,
  Link2,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';

interface ActivityLogViewProps {
  logs: ActivityLog[];
  allUsers: User[];
}

type Group = 'content' | 'files' | 'posting' | 'review' | 'team';

interface ActionInfo {
  label: string;
  icon: LucideIcon;
  /** badge classes */
  badge: string;
  /** timeline dot */
  dot: string;
  group: Group;
}

// One entry per action the server records (server/db.ts + server.ts)
const ACTIONS: Record<string, ActionInfo> = {
  created_content:      { label: 'Content created',     icon: Sparkles,      badge: 'bg-violet-50 text-violet-700 border-violet-200',   dot: 'bg-violet-500', group: 'content' },
  duplicated_content:   { label: 'Content duplicated',  icon: Copy,          badge: 'bg-violet-50 text-violet-700 border-violet-200',   dot: 'bg-violet-500', group: 'content' },
  edited_content:       { label: 'Content edited',      icon: Pencil,        badge: 'bg-slate-100 text-slate-700 border-slate-200',     dot: 'bg-slate-500',  group: 'content' },
  deleted_content:      { label: 'Content deleted',     icon: Trash2,        badge: 'bg-rose-50 text-rose-700 border-rose-200',         dot: 'bg-rose-500',   group: 'content' },
  reassigned_creator:   { label: 'Reassigned',          icon: UserCog,       badge: 'bg-slate-100 text-slate-700 border-slate-200',     dot: 'bg-slate-500',  group: 'content' },
  reassigned_poster:    { label: 'Reassigned',          icon: UserCog,       badge: 'bg-slate-100 text-slate-700 border-slate-200',     dot: 'bg-slate-500',  group: 'content' },
  date_changed:         { label: 'Rescheduled',         icon: Calendar,      badge: 'bg-sky-50 text-sky-700 border-sky-200',            dot: 'bg-sky-500',    group: 'content' },
  status_changed:       { label: 'Status changed',      icon: Activity,      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',   dot: 'bg-indigo-500', group: 'content' },
  editor_notes:         { label: 'Notes updated',       icon: StickyNote,    badge: 'bg-slate-100 text-slate-700 border-slate-200',     dot: 'bg-slate-500',  group: 'content' },
  uploaded_final_video: { label: 'File uploaded',       icon: UploadCloud,   badge: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-500',   group: 'files' },
  replaced_final_video: { label: 'File replaced',       icon: UploadCloud,   badge: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-500',   group: 'files' },
  downloaded_video:     { label: 'File downloaded',     icon: Download,      badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',         dot: 'bg-cyan-500',   group: 'files' },
  marked_posted:        { label: 'Posted',              icon: Rocket,        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', group: 'posting' },
  added_post_url:       { label: 'Post link added',     icon: Link2,         badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', group: 'posting' },
  revision_requested:   { label: 'Revision requested',  icon: RotateCcw,     badge: 'bg-amber-50 text-amber-700 border-amber-200',      dot: 'bg-amber-500',  group: 'review' },
  reported_issue:       { label: 'Issue reported',      icon: AlertTriangle, badge: 'bg-rose-50 text-rose-700 border-rose-200',         dot: 'bg-rose-500',   group: 'review' },
  resolved_issue:       { label: 'Issue resolved',      icon: CheckCircle2,  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', group: 'review' },
  user_added:           { label: 'User added',          icon: UserPlus,      badge: 'bg-purple-50 text-purple-700 border-purple-200',   dot: 'bg-purple-500', group: 'team' },
  user_deleted:         { label: 'User deleted',        icon: UserX,         badge: 'bg-rose-50 text-rose-700 border-rose-200',         dot: 'bg-rose-500',   group: 'team' },
  user_updated:         { label: 'User updated',        icon: UserCog,       badge: 'bg-purple-50 text-purple-700 border-purple-200',   dot: 'bg-purple-500', group: 'team' },
  password_changed:     { label: 'Password changed',    icon: KeyRound,      badge: 'bg-purple-50 text-purple-700 border-purple-200',   dot: 'bg-purple-500', group: 'team' },
  password_viewed:      { label: 'Password viewed',     icon: Eye,           badge: 'bg-purple-50 text-purple-700 border-purple-200',   dot: 'bg-purple-500', group: 'team' },
  settings_updated:     { label: 'Settings updated',    icon: Settings,      badge: 'bg-slate-100 text-slate-700 border-slate-200',     dot: 'bg-slate-500',  group: 'team' },
};

const FALLBACK: ActionInfo = {
  label: 'Activity',
  icon: Activity,
  badge: 'bg-slate-100 text-slate-700 border-slate-200',
  dot: 'bg-slate-500',
  group: 'content',
};

const actionInfo = (action: string): ActionInfo => ACTIONS[action] || FALLBACK;

const FILTERS: { id: 'ALL' | Group; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'content', label: 'Content' },
  { id: 'files', label: 'Uploads & downloads' },
  { id: 'posting', label: 'Posted' },
  { id: 'review', label: 'Revisions & issues' },
  { id: 'team', label: 'Users & settings' },
];

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({ logs, allUsers }) => {
  const [filter, setFilter] = useState<'ALL' | Group>('ALL');
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();
  const filteredLogs = logs.filter(log => {
    if (filter !== 'ALL' && actionInfo(log.action).group !== filter) return false;
    if (
      q &&
      !log.description.toLowerCase().includes(q) &&
      !actionInfo(log.action).label.toLowerCase().includes(q) &&
      !(log.user_name || '').toLowerCase().includes(q)
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Activity</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Everything that happened: content, uploads, downloads, reviews, posting and team changes.
          </p>
        </div>

        <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600">
          Showing <span className="font-medium text-slate-900">{filteredLogs.length}</span> of{' '}
          <span className="font-medium text-slate-900">{logs.length}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="flex items-center gap-1.5 text-slate-500 mr-1">
            <Filter className="w-4 h-4" />
            Filter:
          </span>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === f.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by person, title or action…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7">
        <div className="relative border-l border-slate-200 ml-3 pl-6 sm:pl-8 space-y-3">
          {filteredLogs.map((log) => {
            const user = allUsers.find(u => u.id === log.user_id);
            const info = actionInfo(log.action);
            const Icon = info.icon;
            const dateObj = new Date(log.created_at);
            const roleName = user?.role || log.user_role;

            return (
              <div key={log.id} className="relative">
                <span className={`absolute -left-[30px] sm:-left-[38px] top-5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${info.dot}`} />

                <div className="px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                      {user ? (
                        <UserAvatar user={user} size="sm" />
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-[10px] font-medium flex items-center justify-center">
                          {(log.user_name || 'S')[0].toUpperCase()}
                        </span>
                      )}
                      <span className="text-sm font-medium text-slate-900">
                        {user?.name || log.user_name || 'System'}
                      </span>
                      {roleName && <span className="text-xs text-slate-400">{roleLabel(roleName)}</span>}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${info.badge}`}>
                        <Icon className="w-3 h-3 shrink-0" />
                        {info.label}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      {dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}
                      {dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed mt-1.5">{log.description}</p>
                </div>
              </div>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                <Activity className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-700">No activity found</p>
              <p className="text-xs text-slate-400">Try a different filter or search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
