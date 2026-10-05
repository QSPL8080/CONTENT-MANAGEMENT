import React, { useEffect } from 'react';
import { AppNotification } from '../types';
import { 
  BellRing, 
  X, 
  ArrowRight, 
  Film, 
  Send, 
  RotateCcw, 
  AlertTriangle, 
  Rocket, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface TaskNotificationToastProps {
  notification: AppNotification | null;
  onClose: () => void;
  onOpenTask: (contentId: string) => void;
}

export const TaskNotificationToast: React.FC<TaskNotificationToastProps> = ({
  notification,
  onClose,
  onOpenTask,
}) => {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onClose();
    }, 8000);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  const type = notification.type;

  const getStyleConfig = () => {
    switch (type) {
      case 'posted':
        return {
          badge: '🚀 Task Published',
          badgeClass: 'text-emerald-300 bg-emerald-950/80 border-emerald-700',
          iconBoxClass: 'bg-emerald-600/30 border-emerald-500/40 text-emerald-400',
          icon: <Rocket className="w-5 h-5 animate-bounce" />,
          dotClass: 'bg-emerald-400',
        };
      case 'ready_to_post':
        return {
          badge: '🎬 Task Completed',
          badgeClass: 'text-teal-300 bg-teal-950/80 border-teal-700',
          iconBoxClass: 'bg-teal-600/30 border-teal-500/40 text-teal-300',
          icon: <CheckCircle2 className="w-5 h-5 text-teal-300 animate-pulse" />,
          dotClass: 'bg-teal-400',
        };
      case 'revision':
        return {
          badge: '🔁 Review Flag: Revision Needed',
          badgeClass: 'text-amber-300 bg-amber-950/80 border-amber-700',
          iconBoxClass: 'bg-amber-600/30 border-amber-500/40 text-amber-300',
          icon: <RotateCcw className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />,
          dotClass: 'bg-amber-400',
        };
      case 'issue':
      case 'overdue':
        return {
          badge: '⚠️ Review Flag: Issue Reported',
          badgeClass: 'text-rose-300 bg-rose-950/80 border-rose-700',
          iconBoxClass: 'bg-rose-600/30 border-rose-500/40 text-rose-300',
          icon: <AlertTriangle className="w-5 h-5 animate-pulse" />,
          dotClass: 'bg-rose-400',
        };
      case 'assigned':
        return {
          badge: '📋 Task Assigned',
          badgeClass: 'text-blue-300 bg-blue-950/80 border-blue-700',
          iconBoxClass: 'bg-blue-600/30 border-blue-500/40 text-blue-400',
          icon: <BellRing className="w-5 h-5 animate-bounce" />,
          dotClass: 'bg-blue-400',
        };
      default:
        return {
          badge: '✨ Workflow Update',
          badgeClass: 'text-indigo-300 bg-indigo-950/80 border-indigo-700',
          iconBoxClass: 'bg-indigo-600/30 border-indigo-500/40 text-indigo-300',
          icon: <Sparkles className="w-5 h-5" />,
          dotClass: 'bg-indigo-400',
        };
    }
  };

  const style = getStyleConfig();

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-96 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/80 p-4 transition-all duration-300 animate-in slide-in-from-top-4 fade-in">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0 mt-0.5">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${style.iconBoxClass}`}>
            {style.icon}
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dotClass}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${style.dotClass}`}></span>
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${style.badgeClass}`}>
              {style.badge}
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h4 className="text-sm font-bold text-white leading-snug">
            {notification.title}
          </h4>

          <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
            {notification.message}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${style.dotClass}`} />
              Audio chime &amp; screen pop-up sent
            </span>

            {notification.content_id && (
              <button
                onClick={() => {
                  if (notification.content_id) {
                    onOpenTask(notification.content_id);
                  }
                  onClose();
                }}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                <span>View Task</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

