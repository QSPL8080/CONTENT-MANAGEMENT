import React from 'react';
import { AppNotification } from '../types';
import {
  BellRing,
  X,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Rocket,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

/**
 * In-app pop-ups, shown bottom-right inside ContentOps while the page is open and in front.
 * (When the page is in the background, the Windows/Chrome desktop pop-up is used instead.)
 * Up to 4 stack on top of each other; each closes by itself after ~8 s — hovering pauses it.
 */

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type?: AppNotification['type'];
  content_id?: string | null;
  created_at?: string;
}

interface TaskNotificationToastProps {
  toasts: ToastItem[];
  onClose: (id: string) => void;
  onOpenTask: (contentId: string) => void;
}

const STYLES: Record<string, { label: string; accent: string; iconBox: string; bar: string; icon: React.ReactNode }> = {
  assigned: {
    label: 'New task',
    accent: 'bg-blue-600',
    iconBox: 'bg-blue-50 text-blue-600 ring-blue-100',
    bar: 'bg-blue-500',
    icon: <BellRing className="w-[18px] h-[18px]" />,
  },
  ready_to_post: {
    label: 'Ready to post',
    accent: 'bg-teal-500',
    iconBox: 'bg-teal-50 text-teal-600 ring-teal-100',
    bar: 'bg-teal-500',
    icon: <CheckCircle2 className="w-[18px] h-[18px]" />,
  },
  posted: {
    label: 'Posted',
    accent: 'bg-emerald-500',
    iconBox: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    bar: 'bg-emerald-500',
    icon: <Rocket className="w-[18px] h-[18px]" />,
  },
  revision: {
    label: 'Revision needed',
    accent: 'bg-amber-500',
    iconBox: 'bg-amber-50 text-amber-600 ring-amber-100',
    bar: 'bg-amber-500',
    icon: <RotateCcw className="w-[18px] h-[18px]" />,
  },
  issue: {
    label: 'Issue reported',
    accent: 'bg-rose-500',
    iconBox: 'bg-rose-50 text-rose-600 ring-rose-100',
    bar: 'bg-rose-500',
    icon: <AlertTriangle className="w-[18px] h-[18px]" />,
  },
  overdue: {
    label: 'Overdue',
    accent: 'bg-rose-500',
    iconBox: 'bg-rose-50 text-rose-600 ring-rose-100',
    bar: 'bg-rose-500',
    icon: <AlertTriangle className="w-[18px] h-[18px]" />,
  },
  general: {
    label: 'Update',
    accent: 'bg-indigo-500',
    iconBox: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    bar: 'bg-indigo-500',
    icon: <Sparkles className="w-[18px] h-[18px]" />,
  },
};

/** Removes a leading emoji / symbol from a title ("🆕 New task" → "New task"). */
function cleanTitle(title: string): string {
  return title.replace(/^[^\p{L}\p{N}"'“(]+/u, '').trim() || title;
}

const ToastCard: React.FC<{
  toast: ToastItem;
  onClose: (id: string) => void;
  onOpenTask: (contentId: string) => void;
}> = ({ toast, onClose, onOpenTask }) => {
  const style = STYLES[toast.type || 'general'] || STYLES.general;

  return (
    <div
      role="status"
      aria-live="polite"
      className="toast-enter toast-card pointer-events-auto relative w-full overflow-hidden rounded-xl bg-white border border-slate-200 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.35),0_2px_6px_-2px_rgba(15,23,42,0.08)]"
    >
      {/* coloured edge */}
      <span className={`absolute inset-y-0 left-0 w-1 ${style.accent}`} />

      <div className="pl-4 pr-3 pt-2.5 pb-3">
        {/* app line — like a Chrome notification */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <img src="/quickupp-q.png" alt="" className="w-3.5 h-3.5 rounded-sm object-contain" />
          <span className="font-semibold text-slate-600">Quickupp ContentOps</span>
          <span className="text-slate-300">•</span>
          <span>{style.label}</span>
          <span className="text-slate-300">•</span>
          <span>now</span>
          <button
            onClick={() => onClose(toast.id)}
            className="ml-auto -mr-1 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-1.5 flex items-start gap-3">
          <div className={`shrink-0 w-9 h-9 rounded-lg ring-1 flex items-center justify-center ${style.iconBox}`}>
            {style.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2 break-words">
              {cleanTitle(toast.title)}
            </p>
            {toast.message && (
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed line-clamp-2 break-words">
                {toast.message}
              </p>
            )}
            {toast.content_id && (
              <button
                onClick={() => {
                  if (toast.content_id) onOpenTask(toast.content_id);
                  onClose(toast.id);
                }}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                View task
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* time left — pauses while the mouse is over the pop-up */}
      <span
        className={`toast-timer absolute bottom-0 left-0 h-0.5 w-full origin-left opacity-60 ${style.bar}`}
        onAnimationEnd={() => onClose(toast.id)}
      />
    </div>
  );
};

export const TaskNotificationToast: React.FC<TaskNotificationToastProps> = ({ toasts, onClose, onOpenTask }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed z-[60] bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] flex flex-col items-stretch gap-2.5 pointer-events-none">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onClose={onClose} onOpenTask={onOpenTask} />
      ))}
    </div>
  );
};
