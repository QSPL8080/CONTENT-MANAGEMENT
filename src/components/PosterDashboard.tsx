import React, { useState } from 'react';
import { localDateStr } from '../lib/dates';
import { ContentItem, User } from '../types';
import { StatusBadge, OverdueBadge } from './StatusBadge';
import { PlatformBadge } from './PlatformBadge';
import { roleLabel } from '../lib/roles';
import { 
  Download, 
  Copy, 
  Check, 
  Send, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Smartphone, 
  ExternalLink,
  CheckCircle2,
  FileVideo,
  Hash,
  MessageSquare,
  Sparkles,
  ArrowUpRight,
  User as UserIcon,
  Layers
} from 'lucide-react';

interface PosterDashboardProps {
  currentUser: User;
  allContent: ContentItem[];
  allUsers: User[];
  onSelectContent: (content: ContentItem) => void;
  onOpenPostingModal: (content: ContentItem) => void;
  onOpenIssueModal: (content: ContentItem) => void;
}

export const PosterDashboard: React.FC<PosterDashboardProps> = ({
  currentUser,
  allContent,
  allUsers,
  onSelectContent,
  onOpenPostingModal,
  onOpenIssueModal,
}) => {
  const [copiedCaptionId, setCopiedCaptionId] = useState<string | null>(null);
  const [copiedHashtagsId, setCopiedHashtagsId] = useState<string | null>(null);
  const [mobileMode, setMobileMode] = useState(false);

  const todayStr = localDateStr();
  const nowTime = new Date().toTimeString().slice(0, 5);

  // Today's content for this intern, plus anything from earlier days still waiting to be posted
  const myTodayContent = allContent
    .filter(c =>
      c.poster_id === currentUser.id &&
      (c.scheduled_date === todayStr || (c.scheduled_date < todayStr && c.status === 'READY_TO_POST'))
    )
    .sort((a, b) => (a.scheduled_date + a.scheduled_time).localeCompare(b.scheduled_date + b.scheduled_time));

  // Upcoming content for this poster
  const myUpcomingContent = allContent
    .filter(c => c.poster_id === currentUser.id && c.scheduled_date > todayStr)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  // Overdue check
  const isOverdue = (item: ContentItem) => {
    return item.status === 'READY_TO_POST' && (item.scheduled_date < todayStr || (item.scheduled_date === todayStr && item.scheduled_time < nowTime));
  };

  const handleCopyCaption = async (e: React.MouseEvent, item: ContentItem) => {
    e.stopPropagation();
    if (!item.caption) return;
    try {
      await navigator.clipboard.writeText(item.caption);
      setCopiedCaptionId(item.id);
      setTimeout(() => setCopiedCaptionId(null), 2500);
    } catch {}
  };

  const handleCopyHashtags = async (e: React.MouseEvent, item: ContentItem) => {
    e.stopPropagation();
    if (!item.hashtags) return;
    try {
      await navigator.clipboard.writeText(item.hashtags);
      setCopiedHashtagsId(item.id);
      setTimeout(() => setCopiedHashtagsId(null), 2500);
    } catch {}
  };

  const scheduledCount = myTodayContent.length;
  const readyCount = myTodayContent.filter(c => c.status === 'READY_TO_POST').length;
  const postedCount = myTodayContent.filter(c => c.status === 'POSTED').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Publishing Queue
            </h1>
            <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {currentUser.name}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span className="text-slate-300">·</span>
            <span className="font-medium text-slate-700">{scheduledCount} item{scheduledCount !== 1 ? 's' : ''} in queue</span>
          </p>
        </div>

        <button
          onClick={() => setMobileMode(!mobileMode)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
            mobileMode
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>{mobileMode ? 'Mobile View: ON' : 'Mobile Focus'}</span>
        </button>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-stretch justify-between gap-3">
          <div className="flex flex-col justify-between gap-1 min-w-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Scheduled Today
            </span>
            <span className="text-2xl font-extrabold text-slate-900 leading-none block">
              {scheduledCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl shrink-0 self-center bg-slate-100 text-slate-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-emerald-200/80 shadow-xs flex items-stretch justify-between gap-3">
          <div className="flex flex-col justify-between gap-1 min-w-0">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">
              Ready to Post
            </span>
            <span className="text-2xl font-extrabold text-emerald-700 leading-none block">
              {readyCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl shrink-0 self-center bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-blue-200/80 shadow-xs flex items-stretch justify-between gap-3">
          <div className="flex flex-col justify-between gap-1 min-w-0">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider block">
              Posted Today
            </span>
            <span className="text-2xl font-extrabold text-blue-700 leading-none block">
              {postedCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl shrink-0 self-center bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Active Publishing Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-600" />
            <span>Active Publishing Cards</span>
          </h3>
          <span className="text-xs text-slate-400">
            Click any card to inspect full details
          </span>
        </div>

        {myTodayContent.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-800">All caught up!</h4>
            <p className="text-xs text-slate-500 mt-1">No content pending publication for today.</p>
          </div>
        ) : (
          <div className={`grid gap-5 ${mobileMode ? 'grid-cols-1 max-w-xl mx-auto' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {myTodayContent.map((item) => {
              const overdue = isOverdue(item);
              const editor = allUsers.find(u => u.id === item.editor_id);

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectContent(item)}
                  className={`bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden shadow-xs hover:shadow-md flex flex-col justify-between ${
                    item.status === 'POSTED'
                      ? 'border-slate-200 bg-slate-50/40 opacity-90'
                      : overdue
                      ? 'border-amber-300 ring-2 ring-amber-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Top Row: Time, Platform, Overdue, Status */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2.5 flex-wrap bg-slate-50/50">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <div className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-slate-300" />
                          <span>{item.scheduled_date !== todayStr ? `${item.scheduled_date.slice(5)} ` : ''}{item.scheduled_time}</span>
                        </div>
                        <PlatformBadge platform={item.platform} />
                        {overdue && <OverdueBadge type="posting" />}
                      </div>

                      <StatusBadge status={item.status} size="md" />
                    </div>

                    {/* Card Content */}
                    <div className="p-4 sm:p-5 space-y-4">
                      {/* Title & Metadata */}
                      <div>
                        <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                          {item.title}
                        </h4>
                        
                        <div className="text-xs text-slate-500 mt-2 flex items-center gap-3 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>{editor ? roleLabel(editor.role) : 'Creator'}:</span>
                            <strong className="text-slate-700 font-semibold">{editor?.name || 'Unassigned'}</strong>
                          </span>
                          
                          <span className="text-slate-300">•</span>
                          
                          <span className="inline-flex items-center gap-1">
                            <FileVideo className="w-3.5 h-3.5 text-slate-400" />
                            <span>File:</span>
                            <strong className={`font-mono text-[11px] ${item.video_url ? 'text-emerald-700' : 'text-slate-500'}`}>
                              {item.video_filename || 'Not uploaded yet'}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* Caption Box */}
                      <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                            Caption
                          </span>
                          {item.caption && (
                            <button
                              type="button"
                              onClick={(e) => handleCopyCaption(e, item)}
                              className="text-blue-600 hover:text-blue-700 lowercase font-medium text-xs flex items-center gap-1 transition-colors"
                            >
                              {copiedCaptionId === item.id ? (
                                <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                  <Check className="w-3 h-3" /> Copied!
                                </span>
                              ) : (
                                <span>quick copy</span>
                              )}
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 font-normal leading-relaxed line-clamp-3 select-all">
                          {item.caption || <span className="text-slate-400 italic">No caption provided</span>}
                        </p>
                      </div>

                      {/* Hashtags preview if present */}
                      {item.hashtags && (
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono truncate">
                            <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{item.hashtags}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleCopyHashtags(e, item)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium shrink-0 flex items-center gap-1"
                          >
                            {copiedHashtagsId === item.id ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Copied
                              </span>
                            ) : (
                              <span>Copy Tags</span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="p-4 sm:p-5 pt-0 space-y-3">
                    {/* Action Buttons Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                      {/* 1. DOWNLOAD */}
                      {item.video_url ? (
                        <a
                          href={item.video_url.endsWith('/download') ? item.video_url : `${item.video_url}/download`}
                          download={item.video_filename || 'final_file'}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                          id={`btn-download-${item.id}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      ) : (
                        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 text-slate-400 font-medium text-xs rounded-xl border border-slate-200 cursor-not-allowed">
                          <Download className="w-3.5 h-3.5" />
                          <span>No File</span>
                        </div>
                      )}

                      {/* 2. COPY CAPTION */}
                      <button
                        type="button"
                        disabled={!item.caption}
                        onClick={(e) => handleCopyCaption(e, item)}
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 font-semibold text-xs rounded-xl border transition-all ${
                          !item.caption 
                            ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                            : copiedCaptionId === item.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                        id={`btn-copy-caption-${item.id}`}
                      >
                        {copiedCaptionId === item.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied ✓</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Caption</span>
                          </>
                        )}
                      </button>

                      {/* 3. COPY HASHTAGS */}
                      <button
                        type="button"
                        disabled={!item.hashtags}
                        onClick={(e) => handleCopyHashtags(e, item)}
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 font-semibold text-xs rounded-xl border transition-all ${
                          !item.hashtags 
                            ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                            : copiedHashtagsId === item.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                        id={`btn-copy-hashtags-${item.id}`}
                      >
                        {copiedHashtagsId === item.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied ✓</span>
                          </>
                        ) : (
                          <>
                            <Hash className="w-3.5 h-3.5 text-slate-400" />
                            <span>Hashtags</span>
                          </>
                        )}
                      </button>

                      {/* 4. MARK AS POSTED */}
                      {item.status === 'READY_TO_POST' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPostingModal(item);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                          id={`btn-mark-posted-${item.id}`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Post</span>
                        </button>
                      ) : item.status === 'POSTED' ? (
                        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-50 text-blue-800 font-semibold text-xs rounded-xl border border-blue-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Posted ✓</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center gap-1 px-2 py-2.5 bg-slate-50 text-slate-500 font-medium text-[11px] rounded-xl border border-slate-200 text-center">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{item.status === 'ISSUE' ? 'Issue reported' : 'Waiting'}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Footer: Report Issue & Live URL */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenIssueModal(item);
                        }}
                        className="text-rose-600 hover:text-rose-700 font-medium inline-flex items-center gap-1.5 hover:underline py-1"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Report an issue</span>
                      </button>

                      {item.post_url ? (
                        <a
                          href={item.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 hover:underline py-1"
                        >
                          <span>View live post</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectContent(item)}
                          className="text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 py-1"
                        >
                          <span>Details</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming Posts in Future Days */}
      {myUpcomingContent.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
            <span>Upcoming in Next Days ({myUpcomingContent.length})</span>
          </h3>
          <div className="divide-y divide-slate-100">
            {myUpcomingContent.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectContent(item)}
                className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 px-2 rounded-lg cursor-pointer text-xs transition-colors"
              >
                <div>
                  <span className="font-semibold text-slate-900 block">{item.title}</span>
                  <span className="text-slate-400 text-[11px] flex items-center gap-2 mt-0.5">
                    <span>{item.scheduled_date} at {item.scheduled_time}</span>
                    <span>•</span>
                    <span className="capitalize">{item.platform}</span>
                  </span>
                </div>
                <StatusBadge status={item.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
