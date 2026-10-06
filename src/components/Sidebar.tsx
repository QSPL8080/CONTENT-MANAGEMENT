import React from 'react';
import { User, UserRole, OperationalMetrics } from '../types';
import { canManageTeam, isManagerial, isCreator, roleLabel, ROLE_BADGE_CLASSES } from '../lib/roles';
import { UserAvatar } from './UserAvatar';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Film, 
  Users, 
  Activity, 
  Settings, 
  Clock, 
  Send,
  AlertTriangle,
  Database,
  HardDrive,
  CheckCircle2,
  Layers,
  Sparkles,
  LogOut,
  ChevronRight,
  Shield,
  FileCheck
} from 'lucide-react';

export type NavTab = 
  | 'dashboard'
  | 'calendar'
  | 'content'
  | 'my_work'
  | 'posting_queue'
  | 'team'
  | 'activity'
  | 'settings';

interface SidebarProps {
  currentUser: User;
  currentRole: UserRole;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  metrics?: OperationalMetrics | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  currentRole,
  currentTab,
  onSelectTab,
  metrics,
  isOpenMobile = false,
  onCloseMobile,
  onLogout,
}) => {
  const getNavItems = () => {
    if (canManageTeam(currentRole)) {
      // Super Admin: oversight + user management only
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
        { id: 'team', label: 'Manage Users', icon: Users, badge: null },
        { id: 'activity', label: 'Activity', icon: Activity, badge: null },
        { id: 'settings', label: 'Settings', icon: Settings, badge: null },
      ];
    } else if (isManagerial(currentRole)) {
      // Admin & Manager
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
        { id: 'calendar', label: 'Content Calendar', icon: CalendarIcon, badge: null },
        { id: 'content', label: 'All Content', icon: Film, badge: metrics?.total },
        { id: 'team', label: 'Team', icon: Users, badge: null },
        { id: 'activity', label: 'Activity', icon: Activity, badge: null },
      ];
    } else if (isCreator(currentRole)) {
      // Graphic Designer & Video Editor
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
        { id: 'calendar', label: 'Calendar', icon: CalendarIcon, badge: null },
        { id: 'my_work', label: 'My Work', icon: Clock, badge: (metrics?.planned || 0) + (metrics?.editing || 0) + (metrics?.revision || 0) },
        { id: 'activity', label: 'Activity', icon: Activity, badge: null },
      ];
    } else {
      // Intern
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
        { id: 'calendar', label: 'Calendar', icon: CalendarIcon, badge: null },
        { id: 'posting_queue', label: 'Posting Queue', icon: Send, badge: metrics?.ready_to_post },
        { id: 'activity', label: 'Activity', icon: Activity, badge: null },
      ];
    }
  };

  const navItems = getNavItems();

  const roleBadgeInfo = {
    label: roleLabel(currentRole),
    color: ROLE_BADGE_CLASSES[currentRole] || 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const totalItems = metrics?.total || 0;
  const postedItems = metrics?.posted || 0;
  const completionRate = totalItems > 0 ? Math.round((postedItems / totalItems) * 100) : 0;

  const content = (
    <div className="flex flex-col h-full bg-slate-50/95 border-r border-slate-200/90 w-72 select-none">
      {/* Scrollable Middle Area with generous padding & breathing room */}
      <div className="flex-1 overflow-y-auto p-5 space-y-7">
        {/* Navigation Group 1: Core Menus */}
        <div className="space-y-2.5">
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id as NavTab);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Navigation Group 2: Pipeline Pulse & Statuses */}
        {metrics && (
          <div className="pt-5 border-t border-slate-200/80 space-y-3">
            <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Pipeline Status</span>
              <span className="text-[11px] text-slate-400 font-medium">{totalItems} Total</span>
            </div>

            <div className="space-y-2">
              {/* In Progress */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/70 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="font-semibold text-slate-700">In Editing</span>
                </div>
                <span className="font-bold text-slate-900 text-sm">{metrics.editing}</span>
              </div>

              {/* Ready to Post */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/70 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  <span className="font-semibold text-slate-700">Ready to Post</span>
                </div>
                <span className="font-bold text-teal-700 text-sm">{metrics.ready_to_post}</span>
              </div>

              {/* Published */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/70 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-700">Published</span>
                </div>
                <span className="font-bold text-emerald-700 text-sm">{metrics.posted}</span>
              </div>

              {/* Attention: Overdue or Issues */}
              {(metrics.overdue_posting > 0 || metrics.revision > 0 || metrics.issue > 0) && (
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200/80 text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="font-bold text-rose-800">Needs Attention</span>
                  </div>
                  <span className="font-bold text-rose-700 text-sm">
                    {metrics.overdue_posting + metrics.revision + metrics.issue}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* System & Storage Infrastructure Card */}
        <div className="pt-5 border-t border-slate-200/80">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
            {/* Publishing Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Publish Completion Rate</span>
                <span className="font-bold text-slate-800">{completionRate}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, completionRate)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile & Account Footer (Pinned neatly at bottom with generous padding) */}
      {currentUser && (
        <div className="p-4 border-t border-slate-200/90 bg-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar user={currentUser} size="md" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {currentUser.name}
                </div>
                <div className="text-xs text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                  <span className={`px-2 py-0.5 rounded font-semibold text-[10px] border ${roleBadgeInfo.color}`}>
                    {roleBadgeInfo.label}
                  </span>
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0 h-[calc(100vh-61px)] sticky top-[61px] z-20">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 max-w-xs w-full shadow-2xl z-50 h-full">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
