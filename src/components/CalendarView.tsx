import React, { useState, useMemo } from 'react';
import { localDateStr } from '../lib/dates';
import { isManagerial, roleLabel, canManageContent } from '../lib/roles';
import { 
  ContentItem, 
  User, 
  ContentType, 
  ContentStatus, 
  Platform 
} from '../types';
import { 
  Camera, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Check,
  Plus, 
  Clock, 
  Search, 
  Star, 
  Tag as TagIcon, 
  Trash2, 
  Database, 
  AlignJustify, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Layers,
  X,
  RefreshCw,
  FolderArchive,
  ExternalLink
} from 'lucide-react';

interface CalendarViewProps {
  contentList: ContentItem[];
  allUsers: User[];
  currentUser: User;
  onSelectContent: (content: ContentItem) => void;
  onOpenCreateModal: (date?: string, contentType?: ContentType) => void;
  onMoveDatePrompt: (content: ContentItem, targetDate?: string) => void;
}

type TabMode = 'overview' | 'category' | 'tags' | 'archive' | 'backend';
type ViewDensity = 'month' | 'week' | 'day' | 'list';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(dateStr: string, n: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

const STATUS_FILTERS: { value: ContentStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PLANNED', label: 'Planned' },
  { value: 'EDITING', label: 'Editing' },
  { value: 'READY_TO_POST', label: 'Ready to Post' },
  { value: 'POSTED', label: 'Posted' },
  { value: 'REVISION', label: 'Revision' },
  { value: 'ISSUE', label: 'Issue' },
];

export const CalendarView: React.FC<CalendarViewProps> = ({
  contentList,
  allUsers,
  currentUser,
  onSelectContent,
  onOpenCreateModal,
  onMoveDatePrompt,
}) => {
  const todayObj = new Date();
  const todayStr = localDateStr(todayObj);

  // Default to current month or January 2026 if requested
  const [year, setYear] = useState(todayObj.getFullYear());
  const [month, setMonth] = useState(todayObj.getMonth()); // 0 = Jan, 8 = Sep
  const [activeTab, setActiveTab] = useState<TabMode>('overview');
  // Phones start on the list view (a 7-column month grid is too small to read there)
  const [viewDensity, setViewDensity] = useState<ViewDensity>(
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'list' : 'month'
  );
  const [focusDate, setFocusDate] = useState<string>(localDateStr(todayObj));
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'ALL'>('ALL');
  const [personFilter, setPersonFilter] = useState<string>('ALL');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'ALL'>('ALL');
  const canManage = canManageContent(currentUser.role);
  const userName = (id?: string) => allUsers.find(u => u.id === id)?.name || 'Unassigned';
  const firstName = (id?: string) => userName(id).split(' ')[0];
  const [selectedContentType, setSelectedContentType] = useState<ContentType | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const categoryDropdownRef = React.useRef<HTMLDivElement>(null);
  const tagDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'time' | 'title' | 'status'>('time');
  const [isBackendDrawerOpen, setIsBackendDrawerOpen] = useState(false);

  // Drag and drop
  const [draggingContentId, setDraggingContentId] = useState<string | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthShortNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleToday = () => {
    const cur = new Date();
    setYear(cur.getFullYear());
    setMonth(cur.getMonth());
    setFocusDate(localDateStr(cur));
  };

  const syncMonthTo = (dateStr: string) => {
    const d = parseLocalDate(dateStr);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  // Prev / next for the active view (month, week or day)
  const handlePrev = () => {
    if (viewDensity === 'week' || viewDensity === 'day') {
      const next = addDays(focusDate, viewDensity === 'week' ? -7 : -1);
      setFocusDate(next);
      syncMonthTo(next);
    } else {
      handlePrevMonth();
    }
  };

  const handleNext = () => {
    if (viewDensity === 'week' || viewDensity === 'day') {
      const next = addDays(focusDate, viewDensity === 'week' ? 7 : 1);
      setFocusDate(next);
      syncMonthTo(next);
    } else {
      handleNextMonth();
    }
  };

  const switchView = (v: ViewDensity) => {
    if ((v === 'week' || v === 'day') && (viewDensity === 'month' || viewDensity === 'list')) {
      // Keep the focus inside the month being looked at
      const f = parseLocalDate(focusDate);
      if (f.getFullYear() !== year || f.getMonth() !== month) {
        const isCurrent = year === todayObj.getFullYear() && month === todayObj.getMonth();
        setFocusDate(isCurrent ? localDateStr(todayObj) : `${year}-${String(month + 1).padStart(2, '0')}-01`);
      }
    }
    setViewDensity(v);
  };

  const weekStart = useMemo(() => addDays(focusDate, -parseLocalDate(focusDate).getDay()), [focusDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const headerTitle = (() => {
    if (viewDensity === 'day') {
      return parseLocalDate(focusDate).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (viewDensity === 'week') {
      const a = parseLocalDate(weekDays[0]);
      const b = parseLocalDate(weekDays[6]);
      const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      return `${fmt(a)} – ${fmt(b)}, ${b.getFullYear()}`;
    }
    return `${monthNames[month]} ${year}`;
  })();

  // Indicators list configuration
  const indicators: { type: ContentType; label: string; dotColor: string; bgTint: string }[] = [
    { type: 'carousel', label: 'Carousel Posts', dotColor: 'bg-emerald-500', bgTint: 'hover:bg-emerald-50' },
    { type: 'story', label: 'Stories', dotColor: 'bg-rose-500', bgTint: 'hover:bg-rose-50' },
    { type: 'reel', label: 'Reels', dotColor: 'bg-purple-500', bgTint: 'hover:bg-purple-50' },
    { type: 'thread', label: 'Threads', dotColor: 'bg-amber-400', bgTint: 'hover:bg-amber-50' },
    { type: 'announcement', label: 'Announcements', dotColor: 'bg-sky-500', bgTint: 'hover:bg-sky-50' },
  ];

  // Card pastel backgrounds and borders based on Content Type
  const getTypeStyling = (type: ContentType) => {
    switch (type) {
      case 'carousel':
        return {
          bg: 'bg-[#EFF8F3]',
          border: 'border-[#DCFCE7]',
          hoverBorder: 'hover:border-emerald-400',
          accent: 'text-emerald-700',
        };
      case 'story':
        return {
          bg: 'bg-[#FDF2F2]',
          border: 'border-[#FEE2E2]',
          hoverBorder: 'hover:border-rose-400',
          accent: 'text-rose-700',
        };
      case 'reel':
        return {
          bg: 'bg-[#F5F3FF]',
          border: 'border-[#EDE9FE]',
          hoverBorder: 'hover:border-purple-400',
          accent: 'text-purple-700',
        };
      case 'thread':
        return {
          bg: 'bg-[#FEFCE8]',
          border: 'border-[#FEF08A]',
          hoverBorder: 'hover:border-amber-400',
          accent: 'text-amber-700',
        };
      case 'announcement':
        return {
          bg: 'bg-[#F0F9FF]',
          border: 'border-[#BAE6FD]',
          hoverBorder: 'hover:border-sky-400',
          accent: 'text-sky-700',
        };
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          hoverBorder: 'hover:border-slate-400',
          accent: 'text-slate-700',
        };
    }
  };

  // Status mapping to screenshot labels & color pills
  // SRS §4 colours: Planned grey, Editing amber, Ready green, Posted blue, Revision/Issue red
  const getStatusBadge = (status: ContentStatus) => {
    switch (status) {
      case 'ISSUE':
        return { label: 'Issue', dot: 'bg-rose-500', pill: 'bg-rose-100 text-rose-800' };
      case 'REVISION':
        return { label: 'Revision', dot: 'bg-rose-500', pill: 'bg-rose-100 text-rose-800' };
      case 'POSTED':
        return { label: 'Posted', dot: 'bg-blue-500', pill: 'bg-blue-100 text-blue-800' };
      case 'READY_TO_POST':
        return { label: 'Ready to Post', dot: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-800' };
      case 'EDITING':
        return { label: 'Editing', dot: 'bg-amber-500', pill: 'bg-amber-100 text-amber-800' };
      case 'PLANNED':
      default:
        return { label: 'Planned', dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-700' };
    }
  };

  // Extract all categories
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    contentList.forEach(c => {
      if (c.category) set.add(c.category);
    });
    return ['Education', 'Engagement', 'Promo', ...Array.from(set).filter(c => !['Education', 'Engagement', 'Promo'].includes(c))];
  }, [contentList]);

  // Extract all tags
  const tagsList = useMemo(() => {
    const set = new Set<string>();
    contentList.forEach(c => {
      if (c.tags) c.tags.forEach(t => set.add(t));
      if (c.hashtags) {
        c.hashtags.split(/\s+/).forEach(h => {
          const clean = h.replace('#', '').trim();
          if (clean) set.add(clean);
        });
      }
    });
    return Array.from(set);
  }, [contentList]);

  // Filter content
  const filteredContent = useMemo(() => {
    return contentList.filter((item) => {
      // Content Type filter
      if (selectedContentType !== 'ALL' && item.content_type !== selectedContentType) return false;

      // Category filter
      if (selectedCategory !== 'ALL') {
        const itemCat = item.category || (item.content_type === 'carousel' ? 'Education' : item.content_type === 'story' ? 'Engagement' : 'Promo');
        if (itemCat.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }

      // Tag filter
      if (selectedTag !== 'ALL') {
        const hasTag = (item.tags && item.tags.includes(selectedTag)) || 
                       (item.hashtags && item.hashtags.toLowerCase().includes(selectedTag.toLowerCase()));
        if (!hasTag) return false;
      }

      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (platformFilter !== 'ALL' && item.platform !== platformFilter) return false;
      if (personFilter !== 'ALL' && item.editor_id !== personFilter && item.poster_id !== personFilter) return false;

      // Archive tab filter: only posted items
      if (activeTab === 'archive' && item.status !== 'POSTED') {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchCategory = item.category?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchPeople = userName(item.editor_id).toLowerCase().includes(q) || userName(item.poster_id).toLowerCase().includes(q);
        const matchMeta = item.platform.includes(q) || item.status.toLowerCase().replace(/_/g, ' ').includes(q) || item.scheduled_date.includes(q);
        if (!matchTitle && !matchCategory && !matchDesc && !matchPeople && !matchMeta) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'title') return a.title.localeCompare(b.title);
      if (sortOrder === 'status') return a.status.localeCompare(b.status);
      return a.scheduled_time.localeCompare(b.scheduled_time);
    });
  }, [contentList, selectedContentType, selectedCategory, selectedTag, activeTab, searchQuery, sortOrder, statusFilter, platformFilter, personFilter, allUsers]);

  // Calendar cells starting on SUNDAY (like in the screenshot)
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Sunday-first start offset
    const startOffset = firstDayOfWeek;

    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean; monthAbbr: string }[] = [];

    // Prev month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ 
        dateStr, 
        dayNum: d, 
        isCurrentMonth: false,
        monthAbbr: monthShortNames[prevM]
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ 
        dateStr, 
        dayNum: d, 
        isCurrentMonth: true,
        monthAbbr: monthShortNames[month]
      });
    }

    // Next month padding to fill a complete 35 or 42 grid
    const targetLength = cells.length > 35 ? 42 : 35;
    const remaining = targetLength - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ 
        dateStr, 
        dayNum: d, 
        isCurrentMonth: false,
        monthAbbr: monthShortNames[nextM]
      });
    }

    return cells;
  }, [year, month]);

  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthContent = useMemo(
    () => filteredContent
      .filter(c => c.scheduled_date.startsWith(monthPrefix))
      .sort((a, b) => (a.scheduled_date + a.scheduled_time).localeCompare(b.scheduled_date + b.scheduled_time)),
    [filteredContent, monthPrefix]
  );

  const getContentForDate = (dateStr: string) => {
    return filteredContent.filter(c => c.scheduled_date === dateStr);
  };

  const handleDragStart = (contentId: string) => {
    if (!canManage) return;
    setDraggingContentId(contentId);
  };

  const handleDropOnDate = (targetDate: string) => {
    if (!draggingContentId || !canManage) return;
    const item = contentList.find(c => c.id === draggingContentId);
    if (item && item.scheduled_date !== targetDate) {
      onMoveDatePrompt(item, targetDate);
    }
    setDraggingContentId(null);
  };

  // Count items per content type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      carousel: 0,
      story: 0,
      reel: 0,
      thread: 0,
      announcement: 0,
    };
    contentList.forEach(c => {
      if (counts[c.content_type] !== undefined) {
        counts[c.content_type]++;
      }
    });
    return counts;
  }, [contentList]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Row (Matching Screenshot) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-neutral-900 text-white rounded-xl flex items-center justify-center shadow-xs shrink-0">
            <Camera className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Content Calendar
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium flex items-center gap-2">
              <span>{canManage ? 'All scheduled content' : 'Content assigned to you'}</span>
              <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
              <span>{filteredContent.length} posts active</span>
            </p>
          </div>
        </div>

        {/* Quick Month Shortcuts */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleToday}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
              year === todayObj.getFullYear() && month === todayObj.getMonth()
                ? 'bg-slate-900 text-white border-slate-900' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Today
          </button>
        </div>
      </div>

      {/* 2. Main Two-Column Structure: Left Indicators/Buttons + Right Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
        
        {/* LEFT COLUMN: Indicators & Quick Buttons */}
        <div className="order-2 lg:order-1 lg:col-span-4 xl:col-span-3 2xl:col-span-2 space-y-6 min-w-0">
          
          {/* Card 1: Indicators */}
          <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Indicators
              </h3>
              {selectedContentType !== 'ALL' && (
                <button
                  onClick={() => setSelectedContentType('ALL')}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                >
                  Clear Filter
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {indicators.map((ind) => {
                const isSelected = selectedContentType === ind.type;
                const count = typeCounts[ind.type] || 0;

                return (
                  <button
                    key={ind.type}
                    type="button"
                    onClick={() => {
                      setSelectedContentType(isSelected ? 'ALL' : ind.type);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all ${
                      isSelected 
                        ? 'bg-white shadow-xs ring-1 ring-slate-300 font-bold text-slate-900' 
                        : 'text-slate-700 hover:bg-white/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-3 h-3 rounded-full ${ind.dotColor} shrink-0`} />
                      <span className="text-sm font-medium">
                        - {ind.label}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200/60 text-slate-600">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2: Quick Button (Admins / Managers) */}
          {canManage && (
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Quick Button
            </h3>
            <div className="border-t border-slate-200/80 pt-2" />

            <div className="space-y-2">
              <button
                onClick={() => onOpenCreateModal(undefined, 'carousel')}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200/90 hover:border-emerald-400 hover:bg-emerald-50/30 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-emerald-800 transition-all shadow-2xs group"
                id="btn-quick-new-carousel"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span>New Carousel</span>
              </button>

              <button
                onClick={() => onOpenCreateModal(undefined, 'story')}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200/90 hover:border-rose-400 hover:bg-rose-50/30 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-rose-800 transition-all shadow-2xs group"
                id="btn-quick-new-story"
              >
                <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span>New Story</span>
              </button>

              <button
                onClick={() => onOpenCreateModal(undefined, 'reel')}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200/90 hover:border-purple-400 hover:bg-purple-50/30 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-purple-800 transition-all shadow-2xs group"
                id="btn-quick-new-reel"
              >
                <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span>New Reel</span>
              </button>

              <button
                onClick={() => onOpenCreateModal(undefined, 'thread')}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200/90 hover:border-amber-400 hover:bg-amber-50/30 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-amber-800 transition-all shadow-2xs group"
                id="btn-quick-new-thread"
              >
                <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span>New Threads</span>
              </button>

              <button
                onClick={() => onOpenCreateModal(undefined, 'announcement')}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200/90 hover:border-sky-400 hover:bg-sky-50/30 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-sky-800 transition-all shadow-2xs group"
                id="btn-quick-new-announcement"
              >
                <div className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform">
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span>New Announcement</span>
              </button>
            </div>
          </div>
          )}
        </div>

        {/* RIGHT COLUMN: Tab Bar, Month Nav, Calendar Grid */}
        <div className="order-1 lg:order-2 lg:col-span-8 xl:col-span-9 2xl:col-span-10 space-y-4 min-w-0">
          
          {/* Top Pill Navigation Tabs (Matching Screenshot) */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Overview Tab */}
              <button
                onClick={() => {
                  setActiveTab('overview');
                  setSelectedCategory('ALL');
                  setSelectedTag('ALL');
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'overview'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${activeTab === 'overview' ? 'bg-white' : 'bg-slate-400'}`} />
                <span>Overview</span>
              </button>

              {/* Category Dropdown Tab */}
              <div className="relative" ref={categoryDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                    setIsTagDropdownOpen(false);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    selectedCategory !== 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : isCategoryDropdownOpen
                      ? 'bg-slate-100 text-slate-900 border border-slate-300'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                  <span>Category: {selectedCategory === 'ALL' ? 'All' : selectedCategory}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isCategoryDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Filter by Category
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('ALL');
                        setIsCategoryDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left font-medium"
                    >
                      <span>All Categories</span>
                      {selectedCategory === 'ALL' && <Check className="w-3.5 h-3.5 text-slate-900" />}
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    {categoriesList.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left font-medium"
                      >
                        <span>{cat}</span>
                        {selectedCategory === cat && <Check className="w-3.5 h-3.5 text-slate-900" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags Dropdown Tab */}
              <div className="relative" ref={tagDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsTagDropdownOpen(!isTagDropdownOpen);
                    setIsCategoryDropdownOpen(false);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    selectedTag !== 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : isTagDropdownOpen
                      ? 'bg-slate-100 text-slate-900 border border-slate-300'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <TagIcon className="w-3.5 h-3.5" />
                  <span>Tags: {selectedTag === 'ALL' ? 'All' : `#${selectedTag}`}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isTagDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isTagDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-40 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-1.5 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Filter by Tag
                    </div>
                    {/* Search inside tag dropdown */}
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search tags..."
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-800 outline-none"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTag('ALL');
                          setIsTagDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg text-left font-medium"
                      >
                        <span>All Tags</span>
                        {selectedTag === 'ALL' && <Check className="w-3.5 h-3.5 text-slate-900" />}
                      </button>
                      {tagsList
                        .filter(t => !tagSearchQuery || t.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                        .map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setSelectedTag(tag);
                              setIsTagDropdownOpen(false);
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg text-left font-medium"
                          >
                            <span>#{tag}</span>
                            {selectedTag === tag && <Check className="w-3.5 h-3.5 text-slate-900" />}
                          </button>
                        ))}
                      {tagsList.filter(t => !tagSearchQuery || t.toLowerCase().includes(tagSearchQuery.toLowerCase())).length === 0 && (
                        <div className="text-center py-3 text-xs text-slate-400">
                          No matching tags
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Archive Tab */}
              <button
                onClick={() => {
                  setActiveTab(activeTab === 'archive' ? 'overview' : 'archive');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'archive'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Archive</span>
              </button>

              {/* Demo data (Admin only) */}
              {currentUser.role === 'admin' && (
              <button
                onClick={() => setIsBackendDrawerOpen(true)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
                title="Load demo content"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Demo data</span>
              </button>
              )}
            </div>

            {/* Right Controls: Density, Sort, Search */}
            <div className="flex items-center gap-1.5 ml-auto">
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5" role="tablist" aria-label="Calendar view">
                {(['month', 'week', 'day', 'list'] as ViewDensity[]).map(v => (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={viewDensity === v}
                    onClick={() => switchView(v)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                      viewDensity === v ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setSortOrder(prev => prev === 'time' ? 'title' : prev === 'title' ? 'status' : 'time');
                }}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                title={`Sort by: ${sortOrder}`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isSearchOpen || searchQuery 
                    ? 'bg-blue-50 text-blue-600 border-blue-200' 
                    : 'text-slate-500 hover:text-slate-900 border-slate-200 bg-white hover:bg-slate-50'
                }`}
                title="Search posts"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Inline Search Bar */}
          {isSearchOpen && (
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in duration-150">
              <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search posts by title, hook, category, or note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Filters: status, person, platform (FR-CAL-4) */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ContentStatus | 'ALL')}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400"
              aria-label="Filter by status"
            >
              {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            {canManage && (
              <select
                value={personFilter}
                onChange={(e) => setPersonFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400 max-w-[220px]"
                aria-label="Filter by team member"
              >
                <option value="ALL">Everyone</option>
                {allUsers
                  .filter(u => ['graphic_designer', 'editor', 'poster'].includes(u.role))
                  .map(u => <option key={u.id} value={u.id}>{u.name} · {roleLabel(u.role)}</option>)}
              </select>
            )}
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as Platform | 'ALL')}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400"
              aria-label="Filter by platform"
            >
              <option value="ALL">All platforms</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="youtube_shorts">YouTube Shorts</option>
              <option value="linkedin">LinkedIn</option>
              <option value="x">X (Twitter)</option>
              <option value="tiktok">TikTok</option>
            </select>
            {(statusFilter !== 'ALL' || personFilter !== 'ALL' || platformFilter !== 'ALL') && (
              <button
                onClick={() => { setStatusFilter('ALL'); setPersonFilter('ALL'); setPlatformFilter('ALL'); }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-1"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Month Header & Controls (Matching Screenshot) */}
          <div className="flex items-center justify-between pt-2 pb-1">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {headerTitle}
            </h2>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Today
              </button>

              <button
                onClick={handleNext}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3. CALENDAR GRID VIEW */}
          {viewDensity === 'month' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
              <div className="min-w-[720px]">
              {/* Day Headers (Sun - Sat) */}
              <div className="grid grid-cols-7 border-b border-slate-100 bg-white text-center py-2.5 text-xs font-medium text-slate-400">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 min-h-[640px]">
                {calendarCells.map((cell) => {
                  const dayContent = getContentForDate(cell.dateStr);
                  const isToday = cell.dateStr === todayStr;
                  const isFirstOfMonth = cell.dayNum === 1;

                  return (
                    <div
                      key={cell.dateStr}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={() => handleDropOnDate(cell.dateStr)}
                      className={`min-h-[140px] p-2 flex flex-col transition-colors group relative ${
                        !cell.isCurrentMonth ? 'bg-slate-50/30' : 'bg-white'
                      }`}
                    >
                      {/* Top Day Header */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1">
                          {isToday ? (
                            <span className="w-6 h-6 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                              {cell.dayNum}
                            </span>
                          ) : (
                            <span
                              className={`text-xs font-medium ${
                                cell.isCurrentMonth ? 'text-slate-800' : 'text-slate-300'
                              }`}
                            >
                              {isFirstOfMonth ? `${cell.monthAbbr} 1` : cell.dayNum}
                            </span>
                          )}
                        </div>

                        {canManage && (
                          <button
                            onClick={() => onOpenCreateModal(cell.dateStr)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-100 transition-all cursor-pointer"
                            title={`Plan post for ${cell.dateStr}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Content Cards inside Date Cell */}
                      <div className="space-y-2 flex-1">
                        {dayContent.map((item) => {
                          const styling = getTypeStyling(item.content_type);
                          const statusInfo = getStatusBadge(item.status);
                          const categoryLabel = item.category || (
                            item.content_type === 'carousel' ? 'Education' :
                            item.content_type === 'story' ? 'Engagement' :
                            item.content_type === 'thread' ? 'Education' : 'Promo'
                          );

                          return (
                            <div
                              key={item.id}
                              draggable={canManage}
                              onDragStart={() => handleDragStart(item.id)}
                              onClick={() => onSelectContent(item)}
                              className={`p-2.5 rounded-xl border ${styling.bg} ${styling.border} ${styling.hoverBorder} hover:shadow-xs cursor-pointer transition-all text-left group/card select-none`}
                            >
                              {/* Time + Title */}
                              <div className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {item.scheduled_time}
                              </div>
                              <div className="text-xs font-bold text-slate-950 line-clamp-2 leading-snug">
                                {item.title}
                              </div>
                              <div className="text-[10px] text-slate-600 mt-0.5 truncate" title={`${userName(item.editor_id)} → ${userName(item.poster_id)}`}>
                                {firstName(item.editor_id)} → {firstName(item.poster_id)}
                              </div>

                              {/* Category Tag */}
                              <div className="mt-1">
                                <span className="inline-block bg-black/5 text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-md">
                                  {categoryLabel}
                                </span>
                              </div>

                              {/* Status Badge with Dot */}
                              <div className="mt-2">
                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md ${statusInfo.pill}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                  <span>{statusInfo.label}</span>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {viewDensity === 'week' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
              <div className="grid grid-cols-7 divide-x divide-slate-100 min-w-[700px]">
                {weekDays.map((dateStr) => {
                  const d = parseLocalDate(dateStr);
                  const items = getContentForDate(dateStr);
                  const isToday = dateStr === todayStr;
                  return (
                    <div
                      key={dateStr}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDropOnDate(dateStr)}
                      className={`min-h-[480px] flex flex-col ${isToday ? 'bg-rose-50/30' : ''}`}
                    >
                      <div className="px-2 py-2 border-b border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => { setFocusDate(dateStr); setViewDensity('day'); }}
                          className="text-left"
                          title="Open day view"
                        >
                          <div className="text-[11px] text-slate-400 font-medium">{WEEKDAY_SHORT[d.getDay()]}</div>
                          <div className={`text-sm font-bold ${isToday ? 'text-rose-600' : 'text-slate-900'}`}>
                            {d.getDate()} {monthShortNames[d.getMonth()]}
                          </div>
                        </button>
                        {canManage && (
                          <button
                            onClick={() => onOpenCreateModal(dateStr)}
                            className="p-1 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-100"
                            title={`Plan post for ${dateStr}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="p-2 space-y-2 flex-1">
                        {items.length === 0 && <div className="text-[11px] text-slate-300 text-center pt-4">—</div>}
                        {items.map((item) => {
                          const styling = getTypeStyling(item.content_type);
                          const statusInfo = getStatusBadge(item.status);
                          return (
                            <div
                              key={item.id}
                              draggable={canManage}
                              onDragStart={() => handleDragStart(item.id)}
                              onClick={() => onSelectContent(item)}
                              className={`p-2 rounded-lg border ${styling.bg} ${styling.border} ${styling.hoverBorder} cursor-pointer transition-all select-none`}
                            >
                              <div className="text-[10px] font-semibold text-slate-500">{item.scheduled_time}</div>
                              <div className="text-xs font-bold text-slate-950 line-clamp-2 leading-snug">{item.title}</div>
                              <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                                {firstName(item.editor_id)} → {firstName(item.poster_id)}
                              </div>
                              <span className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusInfo.pill}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                {statusInfo.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DAY VIEW */}
          {viewDensity === 'day' && (() => {
            const items = getContentForDate(focusDate).slice().sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
            return (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden divide-y divide-slate-100">
                <div className="p-4 bg-slate-50/80 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {items.length} item{items.length === 1 ? '' : 's'} scheduled
                  </span>
                  {canManage && (
                    <button
                      onClick={() => onOpenCreateModal(focusDate)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 bg-white"
                    >
                      <Plus className="w-3.5 h-3.5" /> Plan post
                    </button>
                  )}
                </div>
                {items.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 text-sm">Nothing scheduled for this day.</div>
                ) : (
                  items.map((item) => {
                    const statusInfo = getStatusBadge(item.status);
                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectContent(item)}
                        className="p-4 hover:bg-slate-50/80 transition-colors flex items-start gap-4 cursor-pointer"
                      >
                        <div className="w-14 shrink-0 text-sm font-bold text-slate-900 pt-0.5">{item.scheduled_time}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-900 leading-snug">{item.title}</div>
                          <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            <span className="capitalize">{item.content_type} · {item.platform.replace('_', ' ')}</span>
                            <span>Creator: <strong className="text-slate-700">{userName(item.editor_id)}</strong></span>
                            <span>Intern: <strong className="text-slate-700">{userName(item.poster_id)}</strong></span>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md shrink-0 ${statusInfo.pill}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })()}

          {/* 4. LIST / DENSE VIEW (Optional alternative via ≡ button) */}
          {viewDensity === 'list' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden divide-y divide-slate-100">
              <div className="p-4 bg-slate-50/80 font-bold text-xs text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Posts in {monthNames[month]} {year}</span>
                <span>{monthContent.length} items</span>
              </div>

              {monthContent.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No scheduled posts matching this filter.
                </div>
              ) : (
                monthContent.map((item) => {
                  const styling = getTypeStyling(item.content_type);
                  const statusInfo = getStatusBadge(item.status);
                  const categoryLabel = item.category || 'Education';

                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectContent(item)}
                      className="p-3 sm:p-3.5 hover:bg-slate-50/80 transition-colors flex items-start sm:items-center justify-between gap-2 sm:gap-4 cursor-pointer"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className={`w-3 h-3 mt-1 sm:mt-0 shrink-0 rounded-full ${statusInfo.dot}`} />
                        <div>
                          <div className="text-sm font-bold text-slate-900 leading-snug">
                            {item.title}
                          </div>
                          <div className="flex items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-slate-500 flex-wrap">
                            <span>{item.scheduled_date} at {item.scheduled_time}</span>
                            <span>•</span>
                            <span>{firstName(item.editor_id)} → {firstName(item.poster_id)}</span>
                            <span>•</span>
                            <span className="capitalize">{item.content_type}</span>
                            <span>•</span>
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-700">
                              {categoryLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <span className={`text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-md whitespace-nowrap ${statusInfo.pill}`}>
                          {statusInfo.label}
                        </span>
                        <ChevronRight className="hidden sm:block w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Backend Drawer Modal (Triggered by 🗄 Backend tab) */}
      {isBackendDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-y-auto max-h-[92dvh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-slate-800" />
                <h3 className="font-bold text-slate-900 text-base">Backend & Data Management</h3>
              </div>
              <button
                onClick={() => setIsBackendDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Storage:</span>
                  <span className="font-bold text-slate-800">PostgreSQL + server uploads folder</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Scheduled Content:</span>
                  <span className="font-bold text-slate-800">{contentList.length} items</span>
                </div>

              </div>

              <p className="text-xs text-slate-500">
                Adds a sample Instagram schedule for testing. It is assigned to the first designer/editor and intern on the team, and they will get notifications — use only for testing.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/content/seed-instagram-calendar', { method: 'POST', credentials: 'same-origin' });
                      if (res.ok) {
                        window.location.reload();
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Load demo content</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
