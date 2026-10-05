import React, { useState } from 'react';
import { ContentItem, IssueType } from '../types';
import { AlertTriangle, X, Send } from 'lucide-react';

interface ReportIssueModalProps {
  content: ContentItem;
  isOpen: boolean;
  onClose: () => void;
  onSubmitIssue: (data: { issue_type: IssueType; description: string }) => Promise<void>;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  content,
  isOpen,
  onClose,
  onSubmitIssue,
}) => {
  const [issueType, setIssueType] = useState<IssueType>('video_editing_problem');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const issueTypes: { value: IssueType; label: string }[] = [
    { value: 'video_not_downloading', label: 'Video not downloading' },
    { value: 'wrong_video', label: 'Wrong video uploaded' },
    { value: 'video_editing_problem', label: 'Video has editing/audio problem' },
    { value: 'caption_issue', label: 'Caption or hashtag issue' },
    { value: 'platform_issue', label: 'Social platform issue' },
    { value: 'cannot_publish', label: 'Cannot publish right now' },
    { value: 'other', label: 'Other problem' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmitIssue({
        issue_type: issueType,
        description: description.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to report issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Report Issue</h3>
              <p className="text-xs text-slate-500">Alert editor and manager of a problem</p>
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
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Affected Video
            </span>
            <span className="text-xs font-semibold text-slate-900 block mt-0.5">
              {content.title}
            </span>
          </div>

          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Issue Category
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value as IssueType)}
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none"
            >
              {issueTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Details <span className="text-slate-400 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Explain the issue clearly (e.g. Audio cut out at 0:15, or caption text has typo)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg p-2.5 text-sm text-slate-900 outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors"
              id="btn-submit-issue"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Reporting...' : 'Submit Issue'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
