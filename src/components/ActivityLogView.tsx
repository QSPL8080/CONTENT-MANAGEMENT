import React, { useState } from 'react';
import { ActivityLog, User } from '../types';
import { UserAvatar } from './UserAvatar';
import { 
  Activity, 
  Filter, 
  Clock, 
  Search, 
  Sparkles, 
  UploadCloud, 
  Download, 
  Rocket, 
  RotateCcw, 
  AlertTriangle, 
  Calendar,
  Layers,
  CheckCircle2,
  X
} from 'lucide-react';

interface ActivityLogViewProps {
  logs: ActivityLog[];
  allUsers: User[];
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({ logs, allUsers }) => {
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter(log => {
    const actionNormalized = log.action.toUpperCase();
    if (filterAction !== 'ALL') {
      if (filterAction === 'CREATED' && !actionNormalized.includes('CREATE')) return false;
      if (filterAction === 'VIDEO_UPLOADED' && !actionNormalized.includes('UPLOAD')) return false;
      if (filterAction === 'VIDEO_DOWNLOADED' && !actionNormalized.includes('DOWNLOAD')) return false;
      if (filterAction === 'POSTED' && !actionNormalized.includes('POST')) return false;
      if (filterAction === 'ISSUE' && !actionNormalized.includes('ISSUE')) return false;
      if (filterAction === 'REVISION' && !actionNormalized.includes('REVISION')) return false;
      if (filterAction === 'DATE_CHANGED' && !actionNormalized.includes('DATE') && !actionNormalized.includes('TIME')) return false;
      if (filterAction === 'STATUS_CHANGED' && !actionNormalized.includes('STATUS')) return false;
    }
    if (search && !log.description.toLowerCase().includes(search.toLowerCase()) && !log.action.toLowerCase().includes(search.toLowerCase()) && !(log.user_name || '').toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('POST')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
          <Rocket className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>PUBLISHED LIVE</span>
        </span>
      );
    }
    if (act.includes('UPLOAD')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs">
          <UploadCloud className="w-3.5 h-3.5 text-blue-700 shrink-0" />
          <span>VIDEO UPLOADED</span>
        </span>
      );
    }
    if (act.includes('DOWNLOAD')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-100 text-cyan-900 border border-cyan-300 shadow-2xs">
          <Download className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
          <span>VIDEO DOWNLOADED</span>
        </span>
      );
    }
    if (act.includes('REVISION')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
          <RotateCcw className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>REVISION REQUESTED</span>
        </span>
      );
    }
    if (act.includes('ISSUE')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-950 border border-rose-300 shadow-2xs">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
          <span>ISSUE FLAGGED</span>
        </span>
      );
    }
    if (act.includes('DATE') || act.includes('TIME') || act.includes('SCHEDULE')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-100 text-sky-950 border border-sky-300 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-sky-700 shrink-0" />
          <span>RESCHEDULED</span>
        </span>
      );
    }
    if (act.includes('STATUS')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-950 border border-indigo-300 shadow-2xs">
          <Activity className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
          <span>STATUS CHANGED</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-950 border border-purple-300 shadow-2xs">
        <Sparkles className="w-3.5 h-3.5 text-purple-700 shrink-0" />
        <span>CONTENT CREATED</span>
      </span>
    );
  };

  const getNodeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('POST')) return 'bg-emerald-600 ring-emerald-100';
    if (act.includes('UPLOAD')) return 'bg-blue-600 ring-blue-100';
    if (act.includes('DOWNLOAD')) return 'bg-cyan-600 ring-cyan-100';
    if (act.includes('REVISION')) return 'bg-amber-600 ring-amber-100';
    if (act.includes('ISSUE')) return 'bg-rose-600 ring-rose-100';
    if (act.includes('DATE') || act.includes('SCHEDULE')) return 'bg-sky-600 ring-sky-100';
    if (act.includes('STATUS')) return 'bg-indigo-600 ring-indigo-100';
    return 'bg-purple-600 ring-purple-100';
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Publishing Audit Trail &amp; Activity Log
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5 font-medium">
            Real-time audit history of video creation, uploads, downloads, review cycles, and live postings.
          </p>
        </div>

        <div className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs font-bold text-slate-700">
          Showing <span className="text-slate-900">{filteredLogs.length}</span> of <span className="text-slate-900">{logs.length}</span> actions
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold uppercase tracking-wider text-[11px] mr-1">
            <Filter className="w-4 h-4 text-slate-500" />
            <span>Filter by Action:</span>
          </div>

          {[
            { id: 'ALL', label: 'All Activities' },
            { id: 'CREATED', label: 'Created' },
            { id: 'VIDEO_UPLOADED', label: 'Video Uploads' },
            { id: 'POSTED', label: 'Published' },
            { id: 'REVISION', label: 'Revisions' },
            { id: 'ISSUE', label: 'Issues' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterAction(f.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterAction === f.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by user, title, or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-2xs font-medium"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Activity Timeline Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-2xs">
        <div className="relative border-l-2 border-slate-200 ml-4 pl-6 sm:pl-8 space-y-5">
          {filteredLogs.map((log) => {
            const user = allUsers.find(u => u.id === log.user_id);
            const dateObj = new Date(log.created_at);

            return (
              <div key={log.id} className="relative group">
                {/* Timeline Dot */}
                <div 
                  className={`absolute -left-[33px] sm:-left-[41px] top-4 w-4 h-4 rounded-full ring-4 shadow-xs transition-transform group-hover:scale-110 ${getNodeColor(log.action)}`} 
                />

                {/* Activity Card Row */}
                <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all space-y-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    {/* User & Action Badge */}
                    <div className="flex items-center gap-3">
                      {user ? (
                        <UserAvatar user={user} size="sm" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                          {(log.user_name || 'S')[0].toUpperCase()}
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-slate-900 tracking-tight">
                          {user?.name || log.user_name || 'System Operator'}
                        </span>
                        {getActionBadge(log.action)}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {dateObj.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' · '}
                        {dateObj.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-800 font-semibold leading-relaxed pl-1">
                    {log.description}
                  </p>
                </div>
              </div>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                <Activity className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No activity logs found</p>
              <p className="text-xs text-slate-400">Try adjusting your search query or action filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
