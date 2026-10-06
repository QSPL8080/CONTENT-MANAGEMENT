import React from 'react';
import { localDateStr } from '../lib/dates';
import { ContentItem, User } from '../types';
import { StatusBadge, OverdueBadge } from './StatusBadge';
import { PlatformBadge } from './PlatformBadge';
import { roleLabel } from '../lib/roles';
import { 
  FileEdit, 
  UploadCloud, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  RotateCcw, 
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Film,
  AlertCircle,
  MessageSquare,
  User as UserIcon,
  Layers
} from 'lucide-react';

interface EditorDashboardProps {
  currentUser: User;
  allContent: ContentItem[];
  allUsers: User[];
  onSelectContent: (content: ContentItem) => void;
}

export const EditorDashboard: React.FC<EditorDashboardProps> = ({
  currentUser,
  allContent,
  allUsers,
  onSelectContent,
}) => {
  // Only content assigned to this editor / graphic designer
  const myContent = allContent.filter(c => c.editor_id === currentUser.id);

  const assignedCount = myContent.length;
  const editingCount = myContent.filter(c => c.status === 'EDITING').length;
  const readyCount = myContent.filter(c => c.status === 'READY_TO_POST').length;
  const revisionCount = myContent.filter(c => c.status === 'REVISION').length;
  const issueCount = myContent.filter(c => c.status === 'ISSUE').length;
  const postedCount = myContent.filter(c => c.status === 'POSTED').length;

  const todayStr = localDateStr();
  const nowTime = new Date().toTimeString().slice(0, 5);

  // Active work: ISSUE first (most urgent), then REVISION, then EDITING, then PLANNED
  const activeWork = myContent
    .filter(c => c.status === 'ISSUE' || c.status === 'REVISION' || c.status === 'EDITING' || c.status === 'PLANNED')
    .sort((a, b) => {
      // Order priority: ISSUE (0), REVISION (1), EDITING (2), PLANNED (3)
      const rank = (status: string) => {
        if (status === 'ISSUE') return 0;
        if (status === 'REVISION') return 1;
        if (status === 'EDITING') return 2;
        return 3;
      };
      const rankDiff = rank(a.status) - rank(b.status);
      if (rankDiff !== 0) return rankDiff;
      return a.scheduled_date.localeCompare(b.scheduled_date);
    });

  // Overdue check: editing is overdue once the scheduled date has passed
  const isOverdue = (item: ContentItem) => item.status !== 'REVISION' && item.status !== 'ISSUE' && item.scheduled_date < todayStr;
  const isDesigner = currentUser.role === 'graphic_designer';
  const noun = isDesigner ? 'design' : 'video';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {roleLabel(currentUser.role)} Workspace
            </h1>
            <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {currentUser.name}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            {isDesigner
              ? 'Your assigned graphics & designs. Open tasks, review briefs, resolve any reported issues, and upload the final creative.'
              : 'Your assigned video edits. Open tasks, review briefs, resolve any reported issues, and upload the final cuts.'}
          </p>
        </div>
      </div>

      {/* Editor Metrics Summary (Pipeline) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          My Content Pipeline
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="block text-2xl font-extrabold text-slate-900">{assignedCount}</span>
            <span className="text-xs text-slate-500 font-medium">Assigned</span>
          </div>
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-100">
            <span className="block text-2xl font-extrabold text-amber-700">{editingCount}</span>
            <span className="text-xs text-amber-800 font-medium">In Progress</span>
          </div>
          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
            <span className="block text-2xl font-extrabold text-emerald-700">{readyCount}</span>
            <span className="text-xs text-emerald-800 font-medium">Ready to Post</span>
          </div>
          <div className="p-3 bg-orange-50/70 rounded-xl border border-orange-100">
            <span className="block text-2xl font-extrabold text-orange-700">{revisionCount}</span>
            <span className="text-xs text-orange-800 font-medium">Revisions</span>
          </div>
          <div className={`p-3 rounded-xl border transition-all ${
            issueCount > 0 
              ? 'bg-rose-50 border-rose-200 ring-1 ring-rose-300' 
              : 'bg-slate-50 border-slate-100'
          }`}>
            <span className={`block text-2xl font-extrabold ${issueCount > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
              {issueCount}
            </span>
            <span className={`text-xs font-semibold ${issueCount > 0 ? 'text-rose-800' : 'text-slate-500'}`}>
              Issues Reported
            </span>
          </div>
          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100">
            <span className="block text-2xl font-extrabold text-blue-700">{postedCount}</span>
            <span className="text-xs text-blue-800 font-medium">Published</span>
          </div>
        </div>
      </div>





      {/* Active Work Cards (Section 15: My Active Work) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-600" />
            <span>My Active Work</span>
          </h3>
          <span className="text-xs text-slate-500">
            {activeWork.length} {noun}{activeWork.length !== 1 ? 's' : ''} in your queue
          </span>
        </div>

        {activeWork.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
              <Film className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No {noun}s assigned to you right now</p>
            <p className="text-xs text-slate-400">You're all caught up!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {activeWork.map((item) => {
              const poster = allUsers.find(u => u.id === item.poster_id);
              const overdue = isOverdue(item);
              const isIssue = item.status === 'ISSUE';

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectContent(item)}
                  className={`p-4 rounded-xl border bg-white hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                    isIssue
                      ? 'border-rose-300 ring-1 ring-rose-200 hover:border-rose-400'
                      : item.status === 'REVISION'
                      ? 'border-orange-200 ring-1 ring-orange-100 hover:border-orange-300'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <PlatformBadge platform={item.platform} />
                      <div className="flex items-center gap-1.5">
                        {overdue && <OverdueBadge type="editing" />}
                        <StatusBadge status={item.status} size="sm" />
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm leading-snug">
                      {item.title}
                    </h4>

                    {/* Issue / Revision Note if present */}
                    {isIssue ? (
                      <div className="mt-2 p-2 bg-rose-50 rounded-lg text-rose-800 text-[11px] border border-rose-200 font-medium">
                        ⚠️ <strong>Issue:</strong> {item.internal_notes || item.instructions || 'Needs correction'}
                      </div>
                    ) : item.status === 'REVISION' && item.internal_notes ? (
                      <div className="mt-2 p-2 bg-orange-50 rounded-lg text-orange-800 text-[11px] border border-orange-200 font-medium">
                        🔄 <strong>Revision:</strong> {item.internal_notes}
                      </div>
                    ) : item.description ? (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    ) : null}

                    {item.reference_notes && (
                      <div className="mt-2 p-2 bg-slate-50 rounded-lg text-slate-600 text-[11px] font-mono border border-slate-100">
                        Ref: {item.reference_notes}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div className="text-slate-500">
                      <span>Due: </span>
                      <strong className="text-slate-800">{item.scheduled_date} · {item.scheduled_time}</strong>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectContent(item);
                      }}
                      className={`inline-flex items-center gap-1 font-bold text-xs ${
                        isIssue 
                          ? 'text-rose-600 hover:text-rose-700' 
                          : item.status === 'REVISION'
                          ? 'text-orange-600 hover:text-orange-700'
                          : 'text-blue-600 hover:text-blue-700'
                      }`}
                    >
                      <span>
                        {isIssue
                          ? 'Fix & Re-upload'
                          : item.status === 'REVISION'
                          ? 'Re-upload file'
                          : item.status === 'PLANNED'
                          ? 'Open & start'
                          : 'Upload final file'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Work History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">
          Delivered &amp; Posted ({readyCount + postedCount})
        </h3>

        <div className="divide-y divide-slate-100">
          {myContent
            .filter(c => c.status === 'READY_TO_POST' || c.status === 'POSTED')
            .map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectContent(item)}
                className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 px-2 rounded-lg cursor-pointer text-xs transition-colors"
              >
                <div>
                  <span className="font-semibold text-slate-900 block">{item.title}</span>
                  <span className="text-slate-400 text-[11px]">
                    Scheduled {item.scheduled_date} · File: {item.video_filename || '—'}
                  </span>
                </div>
                <StatusBadge status={item.status} size="sm" />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
