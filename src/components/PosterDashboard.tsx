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
  Share2,
  FileVideo,
  Play
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
    try {
      await navigator.clipboard.writeText(item.caption);
      setCopiedCaptionId(item.id);
      setTimeout(() => setCopiedCaptionId(null), 2500);
    } catch {}
  };

  const handleCopyHashtags = async (e: React.MouseEvent, item: ContentItem) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.hashtags);
      setCopiedHashtagsId(item.id);
      setTimeout(() => setCopiedHashtagsId(null), 2500);
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Header & Mobile Toggle */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Publishing Queue — {currentUser.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {myTodayContent.length} post{myTodayContent.length !== 1 ? 's' : ''} in your queue.
          </p>
        </div>

        <button
          onClick={() => setMobileMode(!mobileMode)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
            mobileMode
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>{mobileMode ? 'Mobile View: ON' : 'Mobile Focus Mode'}</span>
        </button>
      </div>

      {/* Progress Counter Pill */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="p-2.5 sm:p-3.5 bg-white rounded-xl border border-slate-200 text-center shadow-2xs flex flex-col items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight min-h-[2.5em] sm:min-h-0 flex items-center justify-center text-slate-400 ">
            Scheduled Today
          </span>
          <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">
            {myTodayContent.length}
          </span>
        </div>
        <div className="p-2.5 sm:p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-center shadow-2xs flex flex-col items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight min-h-[2.5em] sm:min-h-0 flex items-center justify-center text-emerald-700 ">
            Ready to Post
          </span>
          <span className="text-2xl font-extrabold text-emerald-800 mt-0.5 block">
            {myTodayContent.filter(c => c.status === 'READY_TO_POST').length}
          </span>
        </div>
        <div className="p-2.5 sm:p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-center shadow-2xs flex flex-col items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight min-h-[2.5em] sm:min-h-0 flex items-center justify-center text-blue-700 ">
            Posted Today
          </span>
          <span className="text-2xl font-extrabold text-blue-800 mt-0.5 block">
            {myTodayContent.filter(c => c.status === 'POSTED').length}
          </span>
        </div>
      </div>

      {/* Today's Action Cards (Section 11) */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-3">
          <span>Active Publishing Cards</span>
          <span className="text-xs font-normal text-slate-500">
            Tap a card to open its full details
          </span>
        </h3>

        {myTodayContent.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            🎉 Nothing to post today. You're all caught up!
          </div>
        ) : (
          <div className={`grid gap-4 ${mobileMode ? 'grid-cols-1 max-w-xl mx-auto' : 'grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3'}`}>
            {myTodayContent.map((item) => {
              const overdue = isOverdue(item);
              const editor = allUsers.find(u => u.id === item.editor_id);

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectContent(item)}
                  className={`bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden shadow-2xs hover:shadow-md ${
                    item.status === 'POSTED'
                      ? 'border-slate-200 opacity-85'
                      : overdue
                      ? 'border-amber-300 ring-1 ring-amber-200'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap bg-slate-50/40">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <div className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                        <span>{item.scheduled_date !== todayStr ? `${item.scheduled_date.slice(5)} ` : ''}{item.scheduled_time}</span>
                      </div>
                      <PlatformBadge platform={item.platform} />
                      {overdue && <OverdueBadge type="posting" />}
                    </div>

                    <StatusBadge status={item.status} size="md" />
                  </div>

                  {/* Card Body */}
                  <div className="p-4 sm:p-5 space-y-4">
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h4>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span>{editor ? roleLabel(editor.role) : 'Creator'}: <strong className="text-slate-700">{editor?.name || 'Unassigned'}</strong></span>
                        <span>·</span>
                        <span>File: <strong className="text-slate-700 font-mono break-all">{item.video_filename || 'not uploaded yet'}</strong></span>
                      </div>
                    </div>

                    {/* Preview of Caption */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-normal line-clamp-2">
                      <span className="font-semibold text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">
                        Caption Preview
                      </span>
                      {item.caption || 'No caption'}
                    </div>

                    {/* ACTION BUTTONS (Section 11) */}
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      {/* 1. DOWNLOAD FINAL FILE */}
                      {item.video_url ? (
                        <a
                          href={item.video_url.endsWith('/download') ? item.video_url : `${item.video_url}/download`}
                          download={item.video_filename || 'final_file'}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors min-h-[44px]"
                          id={`btn-download-${item.id}`}
                        >
                          <Download className="w-4 h-4" />
                          <span>DOWNLOAD</span>
                        </a>
                      ) : (
                        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl border border-slate-200 min-h-[44px]">
                          <Download className="w-4 h-4" />
                          <span>NO FILE YET</span>
                        </div>
                      )}

                      {/* 2. COPY CAPTION */}
                      <button
                        type="button"
                        onClick={(e) => handleCopyCaption(e, item)}
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 font-bold text-xs rounded-xl border transition-all min-h-[44px] ${
                          copiedCaptionId === item.id
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                        id={`btn-copy-caption-${item.id}`}
                      >
                        {copiedCaptionId === item.id ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Caption copied ✓</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-slate-500" />
                            <span>COPY CAPTION</span>
                          </>
                        )}
                      </button>

                      {/* 3. COPY HASHTAGS */}
                      <button
                        type="button"
                        onClick={(e) => handleCopyHashtags(e, item)}
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 font-bold text-xs rounded-xl border transition-all min-h-[44px] ${
                          copiedHashtagsId === item.id
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                        id={`btn-copy-hashtags-${item.id}`}
                      >
                        {copiedHashtagsId === item.id ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Hashtags copied ✓</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-slate-500" />
                            <span>COPY HASHTAGS</span>
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
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors min-h-[44px]"
                          id={`btn-mark-posted-${item.id}`}
                        >
                          <Send className="w-4 h-4" />
                          <span>MARK AS POSTED</span>
                        </button>
                      ) : item.status === 'POSTED' ? (
                        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-50 text-blue-800 font-bold text-xs rounded-xl border border-blue-200 min-h-[44px]">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          <span>POSTED ✓</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-50 text-slate-500 font-bold text-[11px] rounded-xl border border-slate-200 min-h-[44px] text-center">
                          <Clock className="w-4 h-4" />
                          <span>{item.status === 'ISSUE' ? 'ISSUE REPORTED' : 'WAITING FOR FILE'}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom link: Report issue & Post URL */}
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenIssueModal(item);
                        }}
                        className="text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Problem? Report issue</span>
                      </button>

                      {item.post_url && (
                        <a
                          href={item.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View live post</span>
                        </a>
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
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">
            Upcoming in Next Days ({myUpcomingContent.length})
          </h3>
          <div className="divide-y divide-slate-100">
            {myUpcomingContent.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectContent(item)}
                className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 px-2 rounded-lg cursor-pointer text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-900 block">{item.title}</span>
                  <span className="text-slate-400 text-[11px]">
                    Date: {item.scheduled_date} at {item.scheduled_time} · {item.platform}
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
