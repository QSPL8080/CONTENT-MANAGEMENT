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
  Film
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
  // Only content assigned to this editor
  const myContent = allContent.filter(c => c.editor_id === currentUser.id);

  const assignedCount = myContent.length;
  const editingCount = myContent.filter(c => c.status === 'EDITING').length;
  const readyCount = myContent.filter(c => c.status === 'READY_TO_POST').length;
  const revisionCount = myContent.filter(c => c.status === 'REVISION').length;
  const postedCount = myContent.filter(c => c.status === 'POSTED').length;

  const todayStr = localDateStr();
  const nowTime = new Date().toTimeString().slice(0, 5);

  // Active work: REVISION first, then EDITING, then PLANNED
  const activeWork = myContent
    .filter(c => c.status === 'REVISION' || c.status === 'EDITING' || c.status === 'PLANNED')
    .sort((a, b) => {
      if (a.status === 'REVISION' && b.status !== 'REVISION') return -1;
      if (b.status === 'REVISION' && a.status !== 'REVISION') return 1;
      return a.scheduled_date.localeCompare(b.scheduled_date);
    });

  // FR-OVERDUE-1: editing is overdue once the scheduled date has passed
  const isOverdue = (item: ContentItem) => item.status !== 'REVISION' && item.scheduled_date < todayStr;
  const isDesigner = currentUser.role === 'graphic_designer';
  const noun = isDesigner ? 'design' : 'video';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {roleLabel(currentUser.role)} Workspace — {currentUser.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isDesigner
              ? 'Your assigned designs. Open a task, read the brief, and upload the final creative (image, PDF or ZIP).'
              : 'Your assigned videos. Open a task, read the brief, and upload the final cut.'}
          </p>
        </div>
      </div>

      {/* Editor Metrics Summary (Section 15) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          My Content Pipeline
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="block text-2xl font-extrabold text-slate-900">{assignedCount}</span>
            <span className="text-xs text-slate-500 font-medium">Assigned</span>
          </div>
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-100">
            <span className="block text-2xl font-extrabold text-amber-700">{editingCount}</span>
            <span className="text-xs text-amber-800 font-medium">Editing</span>
          </div>
          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
            <span className="block text-2xl font-extrabold text-emerald-700">{readyCount}</span>
            <span className="text-xs text-emerald-800 font-medium">Ready to Post</span>
          </div>
          <div className="p-3 bg-orange-50/70 rounded-xl border border-orange-100">
            <span className="block text-2xl font-extrabold text-orange-700">{revisionCount}</span>
            <span className="text-xs text-orange-800 font-medium">Revision</span>
          </div>
          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100">
            <span className="block text-2xl font-extrabold text-blue-700">{postedCount}</span>
            <span className="text-xs text-blue-800 font-medium">Posted</span>
          </div>
        </div>
      </div>

      {/* Urgent Revisions Banner if any */}
      {revisionCount > 0 && (
        <div className="p-4 bg-orange-50/90 border border-orange-200 rounded-2xl">
          <div className="flex items-center gap-2 mb-2 text-orange-900 font-bold text-sm">
            <RotateCcw className="w-4 h-4 text-orange-600" />
            <span>Action Required: {revisionCount} Revision{revisionCount > 1 ? 's' : ''} Requested</span>
          </div>
          <p className="text-xs text-orange-800 mb-3">
            Changes were requested. Read the note, then upload the updated final file.
          </p>

          <div className="space-y-2">
            {myContent
              .filter(c => c.status === 'REVISION')
              .map(item => (
                <div
                  key={item.id}
                  onClick={() => onSelectContent(item)}
                  className="bg-white p-3 rounded-xl border border-orange-200 flex items-center justify-between gap-3 cursor-pointer hover:border-orange-400 transition-all"
                >
                  <div>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                      {item.title}
                    </span>
                    <span className="text-xs text-orange-700 mt-0.5 block italic">
                      Note: {item.internal_notes || 'Adjust audio/graphics'}
                    </span>
                  </div>
                  <button className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-lg shrink-0">
                    Open &amp; Re-upload
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Active Work Cards (Section 15: My Active Work) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">My Active Work</h3>
          <span className="text-xs text-slate-500">
            {activeWork.length} {noun}{activeWork.length !== 1 ? 's' : ''} to deliver
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

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectContent(item)}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
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

                    {item.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}

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
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold text-xs"
                    >
                      <span>{item.status === 'PLANNED' ? 'Open & start' : 'Upload final file'}</span>
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
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
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
                className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 px-2 rounded-lg cursor-pointer text-xs"
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
