import React, { useState } from 'react';
import { ContentItem } from '../types';
import { RotateCcw, X, Send } from 'lucide-react';

interface RevisionModalProps {
  content: ContentItem;
  isOpen: boolean;
  onClose: () => void;
  onSubmitRevision: (notes: string) => Promise<void>;
}

export const RevisionModal: React.FC<RevisionModalProps> = ({
  content,
  isOpen,
  onClose,
  onSubmitRevision,
}) => {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Please specify what changes are required for this revision');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmitRevision(notes.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to request revision');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Request Revision</h3>
              <p className="text-xs text-slate-500">Send feedback to editor for adjustments</p>
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
              Content Title
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
              Revision Instructions for Editor
            </label>
            <textarea
              rows={4}
              required
              placeholder="e.g. Cut 3 seconds from the intro hook, remove the watermark, and adjust the audio volume..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting...' : 'Send Revision Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
