import React, { useState } from 'react';
import { ContentItem } from '../types';
import { Calendar as CalendarIcon, X, ArrowRight } from 'lucide-react';

interface MoveDateModalProps {
  content: ContentItem;
  targetDate?: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmMove: (newDate: string) => Promise<void>;
}

export const MoveDateModal: React.FC<MoveDateModalProps> = ({
  content,
  targetDate: initialTargetDate,
  isOpen,
  onClose,
  onConfirmMove,
}) => {
  const [newDate, setNewDate] = useState(initialTargetDate || content.scheduled_date);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const formatDateHuman = (d: string) => {
    try {
      const parts = d.split('-');
      const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmMove(newDate);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Could not move this content. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Reschedule Content</h3>
              <p className="text-xs text-slate-500">Change scheduled publication date</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Content Title
            </span>
            <span className="text-sm font-semibold text-slate-900 block mt-0.5">
              {content.title}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-sm">
            <div className="text-center flex-1">
              <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
                Current Date
              </span>
              <span className="font-medium text-slate-800 block mt-1">
                {formatDateHuman(content.scheduled_date)}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="text-center flex-1">
              <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
                New Target Date
              </span>
              <span className="font-bold text-blue-700 block mt-1">
                {formatDateHuman(newDate)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Choose Date
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none"
            />
          </div>

          <p className="text-xs text-slate-500">
            Move this content from {formatDateHuman(content.scheduled_date)} to {formatDateHuman(newDate)}? The date change will be recorded in the activity history.
          </p>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || newDate === content.scheduled_date}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              {isSubmitting ? 'Moving...' : 'Confirm Move'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
