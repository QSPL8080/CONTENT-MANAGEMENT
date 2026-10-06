import React, { useState } from 'react';
import { localDateStr } from '../lib/dates';
import { ContentItem } from '../types';
import { CheckCircle2, X, ExternalLink, Clock, Link as LinkIcon, Send } from 'lucide-react';

interface PostingConfirmModalProps {
  content: ContentItem;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    post_url?: string;
    posted_at?: string;
    posting_notes?: string;
    platform?: string;
  }) => Promise<void>;
}

export const PostingConfirmModal: React.FC<PostingConfirmModalProps> = ({
  content,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [postUrl, setPostUrl] = useState('');
  const [postedAtTime, setPostedAtTime] = useState(new Date().toTimeString().slice(0, 5));
  const [postedDate, setPostedDate] = useState(localDateStr());
  const [postingNotes, setPostingNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      // Interpret the entered date/time in the user's local timezone (not UTC)
      const local = new Date(`${postedDate}T${postedAtTime}:00`);
      const fullTimestamp = isNaN(local.getTime()) ? new Date().toISOString() : local.toISOString();
      await onConfirm({
        post_url: postUrl.trim(),
        posted_at: fullTimestamp,
        posting_notes: postingNotes.trim(),
        platform: content.platform,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm posting');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-y-auto max-h-[92dvh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Confirm Publication</h3>
              <p className="text-xs text-slate-500">Mark video as published on social media</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Content summary */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Content to be marked Posted
            </div>
            <div className="font-semibold text-slate-900 text-sm">{content.title}</div>
            <div className="text-xs text-slate-500 mt-0.5 capitalize">
              Platform: <span className="font-medium text-slate-800">{content.platform}</span>
            </div>
          </div>

          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Post URL Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Live Social Post URL
            </label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                required
                placeholder="https://instagram.com/p/..."
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Paste the link where followers can watch the live post.
            </p>
          </div>

          {/* Time & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Posted Date
              </label>
              <input
                type="date"
                value={postedDate}
                onChange={(e) => setPostedDate(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Posted Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="time"
                  value={postedAtTime}
                  onChange={(e) => setPostedAtTime(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Optional notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Posting Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Added collaboration tag, pinned first comment..."
              value={postingNotes}
              onChange={(e) => setPostingNotes(e.target.value)}
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg p-2.5 text-xs sm:text-sm text-slate-900 outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !postUrl}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors"
              id="btn-confirm-posted"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Confirming...' : 'Confirm Posted'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
