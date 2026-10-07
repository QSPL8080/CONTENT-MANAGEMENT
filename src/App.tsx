import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  UserRole, 
  ContentItem, 
  ContentType,
  OperationalMetrics, 
  ActivityLog, 
  ContentIssue, 
  AppNotification,
  IssueType
} from './types';
import { api, onUnauthorized } from './lib/api';
import { isManagerial, isCreator, isPoster, roleLabel, canManageContent } from './lib/roles';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { ContentFlowLogo } from './components/Logo';
import { Topbar } from './components/Topbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { AdminDashboard } from './components/AdminDashboard';
import { EditorDashboard } from './components/EditorDashboard';
import { PosterDashboard } from './components/PosterDashboard';
import { CalendarView } from './components/CalendarView';
import { TeamManagement } from './components/TeamManagement';
import { ActivityLogView } from './components/ActivityLogView';
import { SettingsView } from './components/SettingsView';
import { ContentDetailModal } from './components/ContentDetailModal';
import { CreateContentModal } from './components/CreateContentModal';
import { PostingConfirmModal } from './components/PostingConfirmModal';
import { ReportIssueModal } from './components/ReportIssueModal';
import { RevisionModal } from './components/RevisionModal';
import { MoveDateModal } from './components/MoveDateModal';
import { TaskNotificationToast } from './components/TaskNotificationToast';
import { 
  playNotificationSound, 
  sendDesktopNotification, 
  initAudioOnGesture,
  registerNotificationServiceWorker,
  requestBrowserNotificationPermission
} from './lib/notificationService';
import { Loader2, ShieldAlert, BellRing } from 'lucide-react';

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [issues, setIssues] = useState<ContentIssue[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeToastNotification, setActiveToastNotification] = useState<AppNotification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Auth state
  const [realUser, setRealUser] = useState<User | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Track known notifications so we only trigger chime on new arrivals
  const knownNotificationIdsRef = React.useRef<Set<string>>(new Set());

  // Modal States
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<string | undefined>(undefined);
  const [createDefaultContentType, setCreateDefaultContentType] = useState<ContentType | undefined>(undefined);
  const [postingModalContent, setPostingModalContent] = useState<ContentItem | null>(null);
  const [issueModalContent, setIssueModalContent] = useState<ContentItem | null>(null);
  const [revisionModalContent, setRevisionModalContent] = useState<ContentItem | null>(null);
  const [moveDateModalContent, setMoveDateModalContent] = useState<ContentItem | null>(null);
  const [moveDateTargetDate, setMoveDateTargetDate] = useState<string | undefined>(undefined);

  // Load everything the signed-in user is allowed to see (the server scopes each list by role)
  const loadWorkspaceData = useCallback(async () => {
    const [usersRes, contentRes, fetchedMetrics, logsRes, issuesRes, notifsRes] =
      await Promise.all([
        api.getUsers(),
        api.getContent(),
        api.getMetrics(),
        api.getActivity(),
        api.getIssues(),
        api.getNotifications(),
      ]);
    setUsers(usersRes.users);
    setContentList(contentRes.content);
    setMetrics(fetchedMetrics);
    setActivityLogs(logsRes.activity_logs);
    setIssues(issuesRes.issues);
    setNotifications(notifsRes.notifications);
    knownNotificationIdsRef.current = new Set(notifsRes.notifications.map((n: AppNotification) => n.id));
  }, []);

  const resetToSignedOut = useCallback((notice?: string) => {
    setCurrentUser(null);
    setRealUser(null);
    setSelectedContent(null);
    setContentList([]);
    setUsers([]);
    setNotifications([]);
    setActivityLogs([]);
    setIssues([]);
    setMetrics(null);
    setCurrentTab('dashboard');
    setAuthNotice(notice || null);
  }, []);

  // Initial Load: restore the session from the httpOnly cookie, if any
  const loadInitialData = useCallback(async () => {
    try {
      try {
        const me = await api.getMe();
        setCurrentUser(me.user);
        setRealUser(me.user);
        await loadWorkspaceData();
      } catch {
        setCurrentUser(null); // not signed in
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadWorkspaceData]);

  // Any 401 from the API (expired session, account disabled) → back to the sign-in screen
  useEffect(() => {
    onUnauthorized(() => resetToSignedOut('Your session has ended. Please sign in again.'));
  }, [resetToSignedOut]);

  const [dismissedPermBanner, setDismissedPermBanner] = useState(false);

  useEffect(() => {
    loadInitialData();
    initAudioOnGesture();
    registerNotificationServiceWorker();

    // Listen for service worker notification click navigation
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const handleSwMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'OPEN_TASK' && event.data.contentId) {
          const targetId = event.data.contentId;
          api.getContent().then((res) => {
            const match = res.content.find((c: any) => c.id === targetId);
            if (match) setSelectedContent(match);
          });
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      };
    }
  }, [loadInitialData]);

  // ── Auto-logout after 10 minutes of inactivity ──────────────────────────
  const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  const lastActivityRef = React.useRef<number>(Date.now());

  useEffect(() => {
    if (!currentUser) return;

    lastActivityRef.current = Date.now();

    let throttleTimer: any = null;
    const handleUserActivity = () => {
      const now = Date.now();
      if (!throttleTimer && now - lastActivityRef.current > 1000) {
        lastActivityRef.current = now;
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
        }, 1000);
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach(ev => window.addEventListener(ev, handleUserActivity, { passive: true }));

    const checkInactivity = () => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        api.logout().catch(() => {});
        resetToSignedOut('You were automatically logged out after 10 minutes of inactivity.');
      }
    };

    const intervalId = setInterval(checkInactivity, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handleUserActivity));
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [currentUser, resetToSignedOut]);

  // Real-time Global Workflow Notification Listener:
  // Polls server every 3s. Whenever any task is published, completed, reviewed & flagged for revision,
  // an issue reported, or assigned, it triggers a screen pop-up, melodic chime, and visual toast for all persons.
  useEffect(() => {
    if (!currentUser) return;

    const pollInterval = setInterval(async () => {
      try {
        const notifsRes = await api.getNotifications();
        const latestNotifs: AppNotification[] = notifsRes.notifications || [];

        // Check for new notifications directed at this user that haven't been alerted yet
        const newUnseen = latestNotifs.filter(
          (n) => !n.read && n.user_id === currentUser.id && !knownNotificationIdsRef.current.has(n.id)
        );

        if (newUnseen.length > 0) {
          const newest = newUnseen[0];
          newUnseen.forEach((n) => knownNotificationIdsRef.current.add(n.id));

          // 1. Synthesize audio chime
          playNotificationSound();

          // 2. Dispatch native desktop screen pop-up (appears even if minimized or on another tab/window)
          sendDesktopNotification(newest.title, {
            body: newest.message,
            tag: newest.id,
            contentId: newest.content_id,
            onClick: () => {
              if (newest.content_id) {
                api.getContent().then((res) => {
                  const item = res.content.find((c: any) => c.id === newest.content_id);
                  if (item) setSelectedContent(item);
                });
              }
            },
          });

          // 3. Trigger in-app toast
          setActiveToastNotification(newest);

          // 4. Update notification state list
          setNotifications(latestNotifs);

          // 5. Trigger light background refresh so kanban & metrics update immediately
          refreshData();
        }
      } catch {
        // quiet fail on transient network poll
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [currentUser]);

  // Refresh data helper
  const refreshData = async () => {
    try {
      const [contentRes, fetchedMetrics, logsRes, issuesRes, notifsRes] =
        await Promise.all([
          api.getContent(),
          api.getMetrics(),
          api.getActivity(),
          api.getIssues(),
          api.getNotifications(),
        ]);
      setContentList(contentRes.content);
      setMetrics(fetchedMetrics);
      setActivityLogs(logsRes.activity_logs);
      setIssues(issuesRes.issues);
      setNotifications(notifsRes.notifications);
      notifsRes.notifications.forEach((n: AppNotification) => knownNotificationIdsRef.current.add(n.id));

      // Keep selected content in sync if open
      if (selectedContent) {
        const updated = contentRes.content.find((c: ContentItem) => c.id === selectedContent.id);
        if (updated) setSelectedContent(updated);
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  // Called by the sign-in screen after a successful sign-in
  const handleSignedIn = useCallback(async (user: User) => {
    lastActivityRef.current = Date.now();
    setAuthNotice(null);
    setCurrentUser(user);
    setRealUser(user);
    setCurrentTab('dashboard');
    try {
      await loadWorkspaceData();
    } catch (err) {
      console.error('Failed to load workspace after sign-in:', err);
    }
  }, [loadWorkspaceData]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    resetToSignedOut();
  };

  // Content Operations Handlers
  const handleCreateContent = async (contentData: Partial<ContentItem>) => {
    if (!currentUser) return;
    await api.createContent(contentData);
    await refreshData();
  };

  const handleSaveContentEdits = async (contentData: Partial<ContentItem>) => {
    if (!editingContent) return;
    const res = await api.updateContent(editingContent.id, contentData);
    await refreshData();
    if (selectedContent?.id === res.content.id) setSelectedContent(res.content);
  };

  // Creator actions: start working on a task, save creator notes
  const handleStartEditing = async () => {
    if (!selectedContent) return;
    const res = await api.updateContent(selectedContent.id, { status: 'EDITING' });
    setSelectedContent(res.content);
    await refreshData();
  };

  const handleSaveEditorNotes = async (notes: string) => {
    if (!selectedContent) return;
    const res = await api.updateContent(selectedContent.id, { editor_notes: notes });
    setSelectedContent(res.content);
    await refreshData();
  };

  const handleUploadVideo = async (file: File, onProgress: (pct: number) => void) => {
    if (!selectedContent) return;
    const res = await api.uploadVideo(selectedContent.id, file, onProgress);
    await refreshData();
    if (res?.content) {
      setSelectedContent(res.content);
    }
  };

  const handleAttachSampleVideo = async () => {
    if (!selectedContent) return;
    const res = await api.attachSampleVideo(selectedContent.id);
    await refreshData();
    if (res?.content) {
      setSelectedContent(res.content);
    }
  };

  const handleConfirmPosting = async (data: {
    post_url?: string;
    posted_at?: string;
    posting_notes?: string;
    platform?: string;
  }) => {
    const targetItem = postingModalContent || selectedContent;
    if (!targetItem) return;

    await api.markPosted(targetItem.id, data);
    await refreshData();
  };

  const handleRequestRevision = async (notes: string) => {
    const targetItem = revisionModalContent || selectedContent;
    if (!targetItem) return;

    await api.requestRevision(targetItem.id, notes);
    await refreshData();
  };

  const handleSubmitIssue = async (data: { issue_type: IssueType; description: string }) => {
    const targetItem = issueModalContent || selectedContent;
    if (!targetItem) return;

    await api.reportIssue(targetItem.id, data);
    await refreshData();
  };

  const handleResolveIssue = async (issueId: string) => {
    await api.resolveIssue(issueId);
    await refreshData();
  };

  const handleMoveDate = async (newDate: string) => {
    const targetItem = moveDateModalContent || selectedContent;
    if (!targetItem) return;

    await api.updateContent(targetItem.id, { scheduled_date: newDate });
    await refreshData();
  };

  const handleDuplicateContent = async () => {
    if (!selectedContent) return;
    const res = await api.duplicateContent(selectedContent.id);
    await refreshData();
    setSelectedContent(res.content);
  };

  const handleDeleteContent = async () => {
    if (!selectedContent) return;
    if (window.confirm(`Delete "${selectedContent.title}"? This cannot be undone.`)) {
      await api.deleteContent(selectedContent.id);
      setSelectedContent(null);
      await refreshData();
    }
  };

  const handleAddUser = async (userData: Partial<User>) => {
    await api.createUser(userData);
    const updated = await api.getUsers();
    setUsers(updated.users);
  };

  const handleUpdateUser = async (userId: string, data: Partial<User>) => {
    await api.updateUser(userId, data);
    const updated = await api.getUsers();
    setUsers(updated.users);
  };

  // Filter content based on search query
  const q = searchQuery.trim().toLowerCase();
  const userName = (id?: string) => users.find(u => u.id === id)?.name.toLowerCase() || '';
  const displayedContent = q
    ? contentList.filter(
        c =>
          c.title.toLowerCase().includes(q) ||
          (c.caption || '').toLowerCase().includes(q) ||
          (c.hashtags || '').toLowerCase().includes(q) ||
          c.platform.toLowerCase().includes(q) ||
          c.status.toLowerCase().replace(/_/g, ' ').includes(q) ||
          c.scheduled_date.includes(q) ||
          userName(c.editor_id).includes(q) ||
          userName(c.poster_id).includes(q)
      )
    : contentList;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-slate-800 mb-2" />
        <p className="text-sm font-medium">Booting Quickupp ContentOps workspace...</p>
      </div>
    );
  }

  // ── Sign-in screen ──────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <LoginScreen
        onSignedIn={handleSignedIn}
        notice={authNotice}
      />
    );
  }

  const managerial = isManagerial(currentUser.role);
  const creator = isCreator(currentUser.role);
  const poster = isPoster(currentUser.role);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
      {/* Global Topbar */}
      <Topbar
        currentUser={currentUser}
        allUsers={users}
        notifications={notifications}
        onChangePassword={() => setShowChangePassword(true)}
        onLogout={handleLogout}
        onMarkNotificationRead={async (id) => {
          await api.markNotificationRead(id);
          const notifsRes = await api.getNotifications();
          setNotifications(notifsRes.notifications);
        }}
        onMarkAllNotificationsRead={async () => {
          await api.markAllNotificationsRead();
          const notifsRes = await api.getNotifications();
          setNotifications(notifsRes.notifications);
        }}
        onSelectContentById={(contentId) => {
          const item = contentList.find(c => c.id === contentId);
          if (item) setSelectedContent(item);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        onOpenCreateModal={() => {
          setCreateDefaultDate(undefined);
          setIsCreateModalOpen(true);
        }}
      />

      {/* Screen Pop-up Notification Permission Banner */}
      {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default' && !dismissedPermBanner && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-blue-800 shadow-inner z-10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-md bg-blue-800/80 text-blue-200 shrink-0">
              <BellRing className="w-3.5 h-3.5 animate-bounce" />
            </span>
            <span className="min-w-0 leading-snug">
              <strong>Global Screen Pop-ups:</strong> Enable browser notifications to get alerts on your screen whenever a task is published, completed, reviewed, or assigned.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={async () => {
                const res = await requestBrowserNotificationPermission();
                playNotificationSound();
                if (res === 'granted') {
                  sendDesktopNotification('🚀 Screen Pop-up Alerts Enabled!', {
                    body: 'You will now receive desktop pop-ups with chime whenever tasks are published, completed, reviewed, or assigned.',
                  });
                }
                setDismissedPermBanner(true);
              }}
              className="px-3 py-1 bg-white hover:bg-blue-50 text-blue-950 font-bold rounded-lg shadow-sm transition-colors text-xs"
            >
              Enable Screen Pop-ups
            </button>
            <button
              onClick={() => setDismissedPermBanner(true)}
              className="text-blue-300 hover:text-white text-xs px-1.5 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Role scope banner for non-managers */}
      {!managerial && (
        <div className="border-b border-amber-300/80 px-4 sm:px-6 py-2.5 flex items-center gap-3 text-xs text-amber-950 z-10 backdrop-blur bg-amber-50/95">
          <span className="p-1 rounded-md bg-amber-200/80 text-amber-900 shrink-0">
            <ShieldAlert className="w-3.5 h-3.5" />
          </span>
          <span className="min-w-0 leading-snug">
            Signed in as <strong>{currentUser.name}</strong> ({roleLabel(currentUser.role)}).{' '}
            {creator
              ? 'You see only the content assigned to you. Briefs, captions and schedules are set by Admins/Managers.'
              : 'You see only the posts assigned to you. Download, publish, then Mark as Posted.'}
          </span>
        </div>
      )}

      {/* Floating Real-Time Assignment Alert Toast */}
      <TaskNotificationToast
        notification={activeToastNotification}
        onClose={() => setActiveToastNotification(null)}
        onOpenTask={(contentId) => {
          const item = contentList.find(c => c.id === contentId);
          if (item) setSelectedContent(item);
        }}
      />

      {/* Main Layout Container */}
      <div className="flex-1 flex w-full min-w-0">
        {/* Navigation Sidebar */}
        <Sidebar
          currentUser={currentUser}
          currentRole={currentUser.role}
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          metrics={metrics}
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onLogout={handleLogout}
        />

        {/* Main Content View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 w-full overflow-x-hidden">
          <div className="w-full min-w-0">
          {/* TAB 1: DASHBOARD (Adapts to Role) */}
          {currentTab === 'dashboard' && managerial && (
            <AdminDashboard
              canCreate={canManageContent(currentUser.role)}
              metrics={metrics}
              contentList={displayedContent}
              allUsers={users}
              issues={issues}
              onSelectContent={setSelectedContent}
              onOpenCreateModal={() => {
                setCreateDefaultDate(undefined);
                setIsCreateModalOpen(true);
              }}
              onNavigateToCalendar={() => setCurrentTab('calendar')}
            />
          )}

          {currentTab === 'dashboard' && creator && (
            <EditorDashboard
              currentUser={currentUser}
              allContent={displayedContent}
              allUsers={users}
              onSelectContent={setSelectedContent}
            />
          )}

          {currentTab === 'dashboard' && poster && (
            <PosterDashboard
              currentUser={currentUser}
              allContent={displayedContent}
              allUsers={users}
              onSelectContent={setSelectedContent}
              onOpenPostingModal={(item) => setPostingModalContent(item)}
              onOpenIssueModal={(item) => setIssueModalContent(item)}
            />
          )}

          {/* TAB 2: CALENDAR */}
          {currentTab === 'calendar' && (
            <CalendarView
              contentList={displayedContent}
              allUsers={users}
              currentUser={currentUser}
              onSelectContent={setSelectedContent}
              onOpenCreateModal={(date, contentType) => {
                setCreateDefaultDate(date);
                setCreateDefaultContentType(contentType);
                setIsCreateModalOpen(true);
              }}
              onMoveDatePrompt={(item, targetDate) => {
                setMoveDateModalContent(item);
                setMoveDateTargetDate(targetDate);
              }}
            />
          )}

          {/* TAB 3: CONTENT REPOSITORY (Admin View of all content) */}
          {currentTab === 'content' && managerial && (
            <AdminDashboard
              canCreate={canManageContent(currentUser.role)}
              metrics={metrics}
              contentList={displayedContent}
              allUsers={users}
              issues={issues}
              onSelectContent={setSelectedContent}
              onOpenCreateModal={() => {
                setCreateDefaultDate(undefined);
                setIsCreateModalOpen(true);
              }}
              onNavigateToCalendar={() => setCurrentTab('calendar')}
            />
          )}

          {/* TAB 4: MY WORK (Editor) */}
          {currentTab === 'my_work' && creator && (
            <EditorDashboard
              currentUser={currentUser}
              allContent={displayedContent}
              allUsers={users}
              onSelectContent={setSelectedContent}
            />
          )}

          {/* TAB 5: POSTING QUEUE (Poster) */}
          {currentTab === 'posting_queue' && poster && (
            <PosterDashboard
              currentUser={currentUser}
              allContent={displayedContent}
              allUsers={users}
              onSelectContent={setSelectedContent}
              onOpenPostingModal={(item) => setPostingModalContent(item)}
              onOpenIssueModal={(item) => setIssueModalContent(item)}
            />
          )}

          {/* TAB 6: TEAM MANAGEMENT (Admin) */}
          {currentTab === 'team' && managerial && (
            <TeamManagement
              users={users}
              contentList={contentList}
              currentUser={currentUser}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
            />
          )}

          {/* TAB 7: ACTIVITY AUDIT TRAIL */}
          {currentTab === 'activity' && (
            <ActivityLogView
              logs={activityLogs}
              allUsers={users}
            />
          )}

          {/* TAB 8: SETTINGS */}
          {currentTab === 'settings' && (
            <SettingsView currentUser={currentUser} />
          )}
          </div>
        </main>
      </div>

      {/* MODAL 1: Content Detail Workspace Modal */}
      {selectedContent && (
        <ContentDetailModal
          content={selectedContent}
          isOpen={Boolean(selectedContent)}
          onClose={() => setSelectedContent(null)}
          currentUser={currentUser}
          allUsers={users}
          activityLogs={activityLogs.filter(l => l.content_id === selectedContent.id)}
          issues={issues.filter(i => i.content_id === selectedContent.id)}
          onUploadVideo={handleUploadVideo}
          onAttachSampleVideo={currentUser.role === 'admin' ? handleAttachSampleVideo : undefined}
          onMarkPostedClick={() => setPostingModalContent(selectedContent)}
          onRequestRevisionClick={() => setRevisionModalContent(selectedContent)}
          onReportIssueClick={() => setIssueModalContent(selectedContent)}
          onMoveDateClick={() => setMoveDateModalContent(selectedContent)}
          onDuplicateClick={handleDuplicateContent}
          onEditClick={() => setEditingContent(selectedContent)}
          onStartEditing={handleStartEditing}
          onSaveEditorNotes={handleSaveEditorNotes}
          onDeleteClick={handleDeleteContent}
          onResolveIssue={handleResolveIssue}
        />
      )}

      {/* MODAL 2: Create Content Modal */}
      {isCreateModalOpen && (
        <CreateContentModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setCreateDefaultContentType(undefined);
          }}
          users={users}
          defaultDate={createDefaultDate}
          defaultContentType={createDefaultContentType}
          onCreate={handleCreateContent}
        />
      )}

      {/* Change own password (profile menu) */}
      {showChangePassword && (
        <ChangePasswordModal
          forced={false}
          userName={`${currentUser.name} · ${currentUser.email}`}
          onClose={() => setShowChangePassword(false)}
          onChanged={(u) => {
            setShowChangePassword(false);
            setCurrentUser(u);
            setRealUser(u);
            setUsers(prev => prev.map(item => item.id === u.id ? { ...item, ...u } : item));
          }}
          onLogout={handleLogout}
        />
      )}

      {/* MODAL 2b: Edit Content Modal (Admin / Manager) */}
      {editingContent && (
        <CreateContentModal
          isOpen={Boolean(editingContent)}
          onClose={() => setEditingContent(null)}
          users={users}
          initialContent={editingContent}
          onCreate={handleSaveContentEdits}
        />
      )}

      {/* MODAL 3: Posting Confirmation Modal */}
      {postingModalContent && (
        <PostingConfirmModal
          content={postingModalContent}
          isOpen={Boolean(postingModalContent)}
          onClose={() => setPostingModalContent(null)}
          onConfirm={handleConfirmPosting}
        />
      )}

      {/* MODAL 4: Report Issue Modal */}
      {issueModalContent && (
        <ReportIssueModal
          content={issueModalContent}
          isOpen={Boolean(issueModalContent)}
          onClose={() => setIssueModalContent(null)}
          onSubmitIssue={handleSubmitIssue}
        />
      )}

      {/* MODAL 5: Revision Modal */}
      {revisionModalContent && (
        <RevisionModal
          content={revisionModalContent}
          isOpen={Boolean(revisionModalContent)}
          onClose={() => setRevisionModalContent(null)}
          onSubmitRevision={handleRequestRevision}
        />
      )}

      {/* MODAL 6: Move Date Modal */}
      {moveDateModalContent && (
        <MoveDateModal
          content={moveDateModalContent}
          targetDate={moveDateTargetDate}
          isOpen={Boolean(moveDateModalContent)}
          onClose={() => {
            setMoveDateModalContent(null);
            setMoveDateTargetDate(undefined);
          }}
          onConfirmMove={handleMoveDate}
        />
      )}
    </div>
  );
}
