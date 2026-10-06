import React, { useState } from 'react';
import { localDateStr } from '../lib/dates';
import { 
  ContentItem, 
  User, 
  OperationalMetrics, 
  ContentIssue 
} from '../types';
import { StatusBadge, OverdueBadge } from './StatusBadge';
import { PlatformBadge } from './PlatformBadge';
import { UserAvatar } from './UserAvatar';
import { 
  Plus, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  RotateCcw, 
  Film, 
  Calendar as CalendarIcon,
  ArrowRight,
  Send,
  Eye,
  Activity,
  Layers,
  FileEdit,
  FolderOpen
} from 'lucide-react';

interface AdminDashboardProps {
  /** False for the Super Admin (oversight only): hides create/calendar shortcuts. */
  canCreate?: boolean;
  metrics: OperationalMetrics | null;
  contentList: ContentItem[];
  allUsers: User[];
  issues: ContentIssue[];
  onSelectContent: (content: ContentItem) => void;
  onOpenCreateModal: () => void;
  onNavigateToCalendar: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  canCreate = true,
  metrics: metricsProp,
  contentList,
  allUsers,
  issues,
  onSelectContent,
  onOpenCreateModal,
  onNavigateToCalendar,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('TODAY');
  const metrics: OperationalMetrics = metricsProp || {
    total: 0, planned: 0, editing: 0, ready_to_post: 0, posted: 0, revision: 0, issue: 0,
    overdue_editing: 0, overdue_posting: 0, today_count: 0,
  };

  const todayStr = localDateStr();
  const nowTime = new Date().toTimeString().slice(0, 5);

  // Overdue logic
  const isOverdueItem = (item: ContentItem) => {
    if (item.status === 'POSTED') return false;
    const isPastDate = item.scheduled_date < todayStr;
    const isTodayPastTime = item.scheduled_date === todayStr && item.scheduled_time < nowTime;
    return isPastDate || isTodayPastTime;
  };

  const todayItems = contentList.filter(c => c.scheduled_date === todayStr);
  const overdueItems = contentList.filter(isOverdueItem);
  const revisionItems = contentList.filter(c => c.status === 'REVISION');
  const openIssues = issues.filter(i => i.status === 'OPEN');

  // Deduplicate attention items so each unique content item appears only once
  const attentionItemsMap = new Map<string, ContentItem>();
  overdueItems.forEach(item => attentionItemsMap.set(item.id, item));
  revisionItems.forEach(item => attentionItemsMap.set(item.id, item));
  contentList.filter(c => c.status === 'ISSUE').forEach(item => attentionItemsMap.set(item.id, item));
  const attentionItems = Array.from(attentionItemsMap.values());

  const getFilteredItems = () => {
    switch (activeFilter) {
      case 'TODAY':
        return todayItems;
      case 'READY':
        return contentList.filter(c => c.status === 'READY_TO_POST');
      case 'OVERDUE':
        return overdueItems;
      case 'EDITING':
        return contentList.filter(c => c.status === 'EDITING');
      case 'POSTED':
        return contentList.filter(c => c.status === 'POSTED');
      case 'ISSUES':
        return contentList.filter(c => c.status === 'ISSUE');
      default:
        return contentList;
    }
  };

  const filteredItems = getFilteredItems();

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner with Action */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Publishing Operations Command
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Real-time pipeline: designers &amp; video editors, upload handoffs, and intern publishing.
          </p>
        </div>

        {canCreate && (
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToCalendar}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold shadow-2xs transition-colors"
          >
            <CalendarIcon className="w-4 h-4 text-slate-500" />
            <span>Open Calendar</span>
          </button>
          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors"
            id="btn-admin-create-content"
          >
            <Plus className="w-4 h-4" />
            <span>Create Content</span>
          </button>
        </div>
        )}
      </div>

      {/* Top Metrics Cards with Spacious Design */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
        <div
          onClick={() => setActiveFilter('ALL')}
          className={`p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-lg ring-2 ring-slate-900 ring-offset-2'
              : 'bg-white text-slate-900 border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${
            activeFilter === 'ALL' ? 'text-slate-300' : 'text-slate-400'
          }`}>
            Total Content
          </span>
          <span className={`text-3xl sm:text-4xl font-black tracking-tight mt-2 block ${
            activeFilter === 'ALL' ? 'text-white' : 'text-slate-900'
          }`}>
            {metrics.total}
          </span>
        </div>

        <div
          onClick={() => setActiveFilter('EDITING')}
          className={`p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'EDITING'
              ? 'bg-amber-500 text-white border-amber-600 shadow-lg ring-2 ring-amber-500 ring-offset-2'
              : 'bg-white text-slate-900 border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${
            activeFilter === 'EDITING' ? 'text-amber-100' : 'text-slate-400'
          }`}>
            Editing
          </span>
          <span className={`text-3xl sm:text-4xl font-black tracking-tight mt-2 block ${
            activeFilter === 'EDITING' ? 'text-white' : 'text-amber-600'
          }`}>
            {metrics.editing}
          </span>
        </div>

        <div
          onClick={() => setActiveFilter('READY')}
          className={`p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'READY'
              ? 'bg-teal-600 text-white border-teal-700 shadow-lg ring-2 ring-teal-600 ring-offset-2'
              : 'bg-white text-slate-900 border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${
            activeFilter === 'READY' ? 'text-teal-100' : 'text-slate-400'
          }`}>
            Ready to Post
          </span>
          <span className={`text-3xl sm:text-4xl font-black tracking-tight mt-2 block ${
            activeFilter === 'READY' ? 'text-white' : 'text-teal-600'
          }`}>
            {metrics.ready_to_post}
          </span>
        </div>

        <div
          onClick={() => setActiveFilter('POSTED')}
          className={`p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'POSTED'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-lg ring-2 ring-emerald-600 ring-offset-2'
              : 'bg-white text-slate-900 border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${
            activeFilter === 'POSTED' ? 'text-emerald-100' : 'text-slate-400'
          }`}>
            Posted
          </span>
          <span className={`text-3xl sm:text-4xl font-black tracking-tight mt-2 block ${
            activeFilter === 'POSTED' ? 'text-white' : 'text-emerald-600'
          }`}>
            {metrics.posted}
          </span>
        </div>

        <div
          onClick={() => setActiveFilter('OVERDUE')}
          className={`p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'OVERDUE'
              ? 'bg-rose-600 text-white border-rose-700 shadow-lg ring-2 ring-rose-600 ring-offset-2'
              : 'bg-white text-slate-900 border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${
            activeFilter === 'OVERDUE' ? 'text-rose-100' : 'text-slate-400'
          }`}>
            Overdue
          </span>
          <span className={`text-3xl sm:text-4xl font-black tracking-tight mt-2 block ${
            activeFilter === 'OVERDUE' ? 'text-white' : 'text-rose-600'
          }`}>
            {metrics.overdue_posting + metrics.overdue_editing}
          </span>
        </div>

        <div
          onClick={() => setActiveFilter('ISSUES')}
          className={`p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'ISSUES'
              ? 'bg-rose-600 text-white border-rose-700 shadow-lg ring-2 ring-rose-600 ring-offset-2'
              : 'bg-white text-slate-900 border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${
            activeFilter === 'ISSUES' ? 'text-rose-100' : 'text-slate-400'
          }`}>
            Issues
          </span>
          <span className={`text-3xl sm:text-4xl font-black tracking-tight mt-2 block ${
            activeFilter === 'ISSUES' ? 'text-white' : 'text-rose-600'
          }`}>
            {openIssues.length}
          </span>
        </div>
      </div>

      {/* Attention Required Block */}
      {attentionItems.length > 0 && (
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-rose-950 text-base">
                Attention Required ({attentionItems.length})
              </h3>
            </div>
            <span className="text-xs text-rose-700 font-medium">
              Action needed to maintain daily publishing schedule
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {attentionItems.map((item) => {
              const editor = allUsers.find(u => u.id === item.editor_id);
              const poster = allUsers.find(u => u.id === item.poster_id);
              const isOverduePosting = item.status === 'READY_TO_POST' && isOverdueItem(item);
              const isOverdueEditing = (item.status === 'EDITING' || item.status === 'PLANNED') && isOverdueItem(item);

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectContent(item)}
                  className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-2xs hover:border-rose-400 hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-xs font-bold text-slate-500">
                        {item.scheduled_date} · {item.scheduled_time}
                      </span>
                      {isOverduePosting && <OverdueBadge type="posting" />}
                      {isOverdueEditing && <OverdueBadge type="editing" />}
                      {item.status === 'REVISION' && (
                        <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                          Revision
                        </span>
                      )}
                      {item.status === 'ISSUE' && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                          Issue
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-slate-900 text-sm line-clamp-1">
                      {item.title}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-100">
                    <span>Creator: <strong className="text-slate-700">{editor?.name || 'None'}</strong></span>
                    <span>Intern: <strong className="text-slate-700">{poster?.name || 'None'}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Feed with Quick Filters (Spacious card) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 lg:p-8 shadow-2xs space-y-5 sm:space-y-6 min-w-0">
        <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-900 text-lg">
              {({ TODAY: "Today's Content", READY: 'Ready to Post', EDITING: 'Editing', POSTED: 'Posted', OVERDUE: 'Overdue', ISSUES: 'Issues', ALL: 'All Content' } as Record<string, string>)[activeFilter] || 'Content'}
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">
              {filteredItems.length} item{filteredItems.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Filter Pills with generous padding */}
          <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap overflow-x-auto max-w-full w-full sm:w-auto bg-slate-100/80 p-1.5 rounded-xl">
            {[
              { id: 'TODAY', label: "Today's Content" },
              { id: 'READY', label: 'Ready to Post' },
              { id: 'EDITING', label: 'Editing' },
              { id: 'POSTED', label: 'Posted' },
              { id: 'OVERDUE', label: 'Overdue' },
              { id: 'ALL', label: 'All Content' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  activeFilter === f.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content List */}
        <div className="divide-y divide-slate-100">
          {filteredItems.map((item) => {
            const editor = allUsers.find(u => u.id === item.editor_id);
            const poster = allUsers.find(u => u.id === item.poster_id);

            return (
              <div
                key={item.id}
                onClick={() => onSelectContent(item)}
                className="py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50 px-2 sm:px-4 rounded-xl cursor-pointer transition-all group"
              >
                {/* Time & Title */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 sm:w-16 text-center shrink-0">
                    <span className="block text-xs font-bold text-slate-900">
                      {item.scheduled_time}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-medium">
                      {item.scheduled_date}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <PlatformBadge platform={item.platform} />
                      <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                      <span>
                        Creator: <strong className="text-slate-800 font-semibold">{editor?.name || 'Unassigned'}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Intern: <strong className="text-slate-800 font-semibold">{poster?.name || 'Unassigned'}</strong>
                      </span>
                      {item.post_url && (
                        <>
                          <span>·</span>
                          <span className="text-blue-600 font-medium truncate max-w-[200px]">
                            {item.post_url}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status & CTA */}
                <div className="flex items-center gap-3.5 shrink-0">
                  <StatusBadge status={item.status} size="sm" />
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">No content found in this queue</p>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  {canCreate ? 'Create a new content item or change your active filter above.' : 'Change your active filter above to view other queues.'}
                </p>
              </div>
              {canCreate && (
                <button
                  onClick={onOpenCreateModal}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Post</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
