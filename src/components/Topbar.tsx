import React, { useState, useRef, useEffect } from 'react';
import { User, AppNotification } from '../types';
import { isManagerial, isCreator, roleLabel, canManageContent, ROLE_BADGE_CLASSES, ROLE_DOT_CLASSES } from '../lib/roles';
import { UserAvatar } from './UserAvatar';
import { ContentFlowLogo } from './Logo';
import { 
  Bell, 
  Search, 
  Plus, 
  Calendar as CalendarIcon, 
  ChevronDown, 
  Check, 
  Sparkles, 
  AlertTriangle, 
  RotateCcw, 
  Film, 
  X, 
  Volume2, 
  BellRing, 
  Shield, 
  Send, 
  Rocket,
  LogOut,
  KeyRound
} from 'lucide-react';
import { 
  playNotificationSound, 
  requestBrowserNotificationPermission, 
  sendDesktopNotification, 
  getBrowserNotificationPermission 
} from '../lib/notificationService';

interface TopbarProps {
  currentUser: User;
  allUsers: User[];
  onChangePassword?: () => void;
  onLogout?: () => void;
  onOpenCreateModal: () => void;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onSelectContentById?: (contentId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleMobileMenu?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentUser,
  allUsers,
  onChangePassword,
  onLogout,
  onOpenCreateModal,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onSelectContentById,
  searchQuery,
  onSearchChange,
  onToggleMobileMenu,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showSoundMenu, setShowSoundMenu] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
  const [soundTested, setSoundTested] = useState(false);

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const soundMenuRef = useRef<HTMLDivElement>(null);

  const unreadNotifications = notifications.filter(n => !n.read);

  useEffect(() => {
    setPermissionState(getBrowserNotificationPermission());
  }, []);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
      if (soundMenuRef.current && !soundMenuRef.current.contains(e.target as Node)) {
        setShowSoundMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEnableAlerts = async () => {
    const res = await requestBrowserNotificationPermission();
    setPermissionState(res);
    playNotificationSound();
    if (res === 'granted') {
      sendDesktopNotification('Browser Desktop Alerts Active ✓', {
        body: 'You will receive screen pop-up notifications with audio chime when tasks are assigned.',
      });
    }
  };

  const getNotifIcon = (type?: string) => {
    switch (type) {
      case 'posted':
        return <Rocket className="w-4 h-4 text-emerald-600" />;
      case 'ready_to_post':
        return <Film className="w-4 h-4 text-teal-600" />;
      case 'revision':
        return <RotateCcw className="w-4 h-4 text-amber-600" />;
      case 'issue':
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'assigned':
        return <BellRing className="w-4 h-4 text-blue-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-indigo-600" />;
    }
  };

  const roleBadgeConfig = {
    label: roleLabel(currentUser.role),
    color: ROLE_BADGE_CLASSES[currentUser.role] || 'text-slate-700 bg-slate-50 border-slate-200',
    dot: ROLE_DOT_CLASSES[currentUser.role] || 'bg-slate-500',
    icon: isManagerial(currentUser.role)
      ? <Shield className="w-3 h-3" />
      : isCreator(currentUser.role)
      ? <Film className="w-3 h-3" />
      : <Send className="w-3 h-3" />,
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 w-full">
      <div className="px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 w-full">
        {/* Left: Brand & Date */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 hover:bg-slate-50"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <span className="sm:hidden"><ContentFlowLogo size="md" showText={false} /></span>
          <span className="hidden sm:block"><ContentFlowLogo size="md" /></span>

          <div className="hidden xl:flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-200 text-xs font-medium text-slate-500 whitespace-nowrap">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Center: Search (hidden on phones — opened from the search icon) */}
        <div className="hidden lg:block flex-1 max-w-md mx-2 min-w-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search content, platform, status..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions, Notifications, Role Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileSearchOpen(v => !v)}
            className={`lg:hidden p-2 rounded-lg border transition-colors ${
              mobileSearchOpen || searchQuery ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {canManageContent(currentUser.role) && (
            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium p-2 sm:px-3 sm:py-1.5 rounded-lg shadow-sm transition-colors shrink-0"
              id="btn-create-content"
              aria-label="Create Content"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden lg:inline whitespace-nowrap">Create Content</span>
              <span className="hidden sm:inline lg:hidden">Create</span>
            </button>
          )}

          {/* Browser Alert & Chime Control */}
          <div className="relative hidden sm:block" ref={soundMenuRef}>
            <button
              onClick={() => setShowSoundMenu(!showSoundMenu)}
              className={`relative p-2 rounded-lg transition-colors border ${
                permissionState === 'granted'
                  ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100/60'
                  : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Browser Pop-up & Audio Chime Settings"
              aria-label="Browser Notification Settings"
            >
              <Volume2 className="w-4 h-4" />
              <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${permissionState === 'granted' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            </button>

            {showSoundMenu && (
              <div className="fixed inset-x-3 top-[60px] sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <BellRing className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Alerts &amp; Audio</h4>
                  </div>
                </div>

                <div className="py-3 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Desktop Alerts:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      permissionState === 'granted' 
                        ? 'bg-emerald-100 text-emerald-800'
                        : permissionState === 'denied'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {permissionState === 'granted' ? 'Active' : permissionState === 'denied' ? 'Blocked' : 'Off'}
                    </span>
                  </div>

                  {permissionState !== 'granted' && permissionState !== 'unsupported' && (
                    <button
                      onClick={handleEnableAlerts}
                      className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      <span>Enable Alerts</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      playNotificationSound();
                      setSoundTested(true);
                      setTimeout(() => setSoundTested(false), 1500);
                    }}
                    className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-slate-600" />
                    <span>{soundTested ? 'Sound Played ✓' : 'Test Sound Chime'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifMenuRef}>
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotifications.length}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="fixed inset-x-3 top-[60px] sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">Notifications</span>
                    {unreadNotifications.length > 0 && (
                      <span className="px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-rose-100 text-rose-700">
                        {unreadNotifications.length} new
                      </span>
                    )}
                  </div>
                  {unreadNotifications.length > 0 && (
                    <button
                      onClick={onMarkAllNotificationsRead}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          onMarkNotificationRead(notif.id);
                          if (notif.content_id && onSelectContentById) {
                            onSelectContentById(notif.content_id);
                            setShowNotifMenu(false);
                          }
                        }}
                        className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3 ${
                          !notif.read ? 'bg-slate-50/70 font-medium' : ''
                        }`}
                      >
                        <div className="mt-0.5 p-1.5 bg-white rounded-md border border-slate-200 shadow-2xs shrink-0">
                          {getNotifIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-semibold text-slate-900 truncate">
                              {notif.title}
                            </h4>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Role Profile & Identity Switcher */}
          <div className="relative" ref={roleMenuRef}>
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 p-1 sm:pl-2 sm:pr-3 sm:py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all bg-white shadow-2xs"
              id="btn-admin-profile"
            >
              <UserAvatar user={currentUser} size="sm" />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 text-slate-500">
                  <span className={`w-1.5 h-1.5 rounded-full ${roleBadgeConfig.dot} inline-block`} />
                  {roleBadgeConfig.label}
                </div>
              </div>
              <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {showRoleMenu && (
              <div className="fixed inset-x-3 top-[60px] sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <UserAvatar user={currentUser} size="md" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</div>
                    <div className="text-xs text-slate-500 truncate">{currentUser.email}</div>
                  </div>
                </div>

                <div className="pt-2 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 font-medium">Active Role:</span>
                    <span className={`font-semibold px-2 py-0.5 rounded-md border text-[10px] tracking-wider uppercase flex items-center gap-1 ${roleBadgeConfig.color}`}>
                      {roleBadgeConfig.icon}
                      {roleBadgeConfig.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 font-medium">Access Scope:</span>
                    <span className="font-medium text-slate-800 text-right">
                      {currentUser.role === 'super_admin'
                        ? 'Dashboard, users & settings'
                        : currentUser.role === 'admin'
                        ? 'All content & assignments'
                        : currentUser.role === 'manager'
                        ? 'All content & assignments'
                        : currentUser.role === 'graphic_designer'
                        ? 'Assigned design work'
                        : currentUser.role === 'editor'
                        ? 'Assigned video editing'
                        : 'Assigned posting queue'}
                    </span>
                  </div>
                </div>

                {onChangePassword && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        onChangePassword();
                      }}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Change password</span>
                    </button>
                  </div>
                )}

                {onLogout && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Phone search row */}
      {mobileSearchOpen && (
        <div className="lg:hidden px-3 sm:px-6 pb-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Search content, people, status…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-xl pl-9 pr-9 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
