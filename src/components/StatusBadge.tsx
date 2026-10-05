import React from 'react';
import { ContentStatus } from '../types';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  AlertTriangle, 
  FileEdit,
  RotateCcw 
} from 'lucide-react';

interface StatusBadgeProps {
  status: ContentStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const configs: Record<
    ContentStatus,
    { label: string; bg: string; text: string; border: string; dot: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    PLANNED: {
      label: 'Planned',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      dot: 'bg-slate-400',
      icon: Clock,
    },
    EDITING: {
      label: 'Editing',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
      icon: FileEdit,
    },
    READY_TO_POST: {
      label: 'Ready to Post',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
      icon: Sparkles,
    },
    POSTED: {
      label: 'Posted',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
      icon: CheckCircle2,
    },
    REVISION: {
      label: 'Revision',
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      border: 'border-orange-200',
      dot: 'bg-orange-500',
      icon: RotateCcw,
    },
    ISSUE: {
      label: 'Issue',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      dot: 'bg-rose-500',
      icon: AlertCircle,
    },
  };

  const config = configs[status] || configs.PLANNED;
  const Icon = config.icon;

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-medium px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border whitespace-nowrap select-none font-medium tracking-tight ${config.bg} ${config.text} ${config.border} ${sizeStyles[size]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </span>
  );
};

export const OverdueBadge: React.FC<{ type: 'editing' | 'posting'; className?: string }> = ({
  type,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 whitespace-nowrap ${className}`}
    >
      <AlertTriangle className="w-3 h-3 text-amber-600" />
      <span>{type === 'editing' ? 'Editing Overdue' : 'Posting Overdue'}</span>
    </span>
  );
};
