import React, { useState, useRef } from 'react';
import { localDateStr } from '../lib/dates';
import { 
  ContentItem, 
  User, 
  ActivityLog, 
  ContentIssue, 
  IssueType 
} from '../types';
import { StatusBadge, OverdueBadge } from './StatusBadge';
import { PlatformBadge, ContentTypeBadge } from './PlatformBadge';
import { UserAvatar } from './UserAvatar';
import { isManagerial, isCreator, isPoster, roleLabel, canManageContent, canDeleteContent } from '../lib/roles';
import { ticketMessage, whatsappLink, whatsappDigits } from '../lib/whatsapp';
import { 
  X, 
  Download, 
  UploadCloud, 
  Copy, 
  Check, 
  ExternalLink, 
  Clock, 
  Calendar, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  CopyCheck, 
  Trash2, 
  Send,
  FileVideo,
  FileText,
  Activity,
  AlertCircle,
  HelpCircle,
  Film,
  Lock,
  Shield,
  Pencil,
  PlayCircle,
  FileImage,
  FileArchive,
  StickyNote
} from 'lucide-react';

const VIDEO_EXT = ['.mp4', '.mov', '.webm', '.m4v', '.mkv', '.avi', '.wmv', '.flv', '.3gp', '.ts', '.mts', '.m2ts', '.ogv', '.ogg', '.qt'];
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const ACCEPT_ATTR = 'video/*,image/jpeg,image/png,image/webp,image/gif,application/pdf,.zip,' + [...VIDEO_EXT, ...IMAGE_EXT, '.pdf', '.zip'].join(',');

function extOf(name?: string) {
  if (!name) return '';
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i).toLowerCase();
}

function assetKind(name?: string): 'video' | 'image' | 'pdf' | 'zip' | 'other' {
  const ext = extOf(name);
  if (VIDEO_EXT.includes(ext)) return 'video';
  if (IMAGE_EXT.includes(ext)) return 'image';
  if (ext === '.pdf') return 'pdf';
  if (ext === '.zip') return 'zip';
  return 'other';
}

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.85 9.85 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.24 8.24 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.17c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.24-.64.8-.78.97-.15.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.29Z" />
  </svg>
);

interface ContentDetailModalProps {
  content: ContentItem;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  activityLogs: ActivityLog[];
  issues: ContentIssue[];
  onUploadVideo: (file: File, onProgress: (pct: number) => void) => Promise<void>;
  onAttachSampleVideo?: () => Promise<void>;
  onMarkPostedClick: () => void;
  onRequestRevisionClick: () => void;
  onReportIssueClick: () => void;
  onMoveDateClick: () => void;
  onDuplicateClick: () => Promise<void>;
  onEditClick?: () => void;
  onStartEditing?: () => Promise<void>;
  onSaveEditorNotes?: (notes: string) => Promise<void>;
  onDeleteClick: () => Promise<void>;
  onResolveIssue: (issueId: string) => Promise<void>;
}

export const ContentDetailModal: React.FC<ContentDetailModalProps> = ({
  content,
  isOpen,
  onClose,
  currentUser,
  allUsers,
  activityLogs,
  issues,
  onUploadVideo,
  onAttachSampleVideo,
  onMarkPostedClick,
  onRequestRevisionClick,
  onReportIssueClick,
  onMoveDateClick,
  onDuplicateClick,
  onEditClick,
  onStartEditing,
  onSaveEditorNotes,
  onDeleteClick,
  onResolveIssue,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'issues'>('details');
  const [captionCopied, setCaptionCopied] = useState(false);
  const [hashtagsCopied, setHashtagsCopied] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAttachingSample, setIsAttachingSample] = useState(false);
  const [notesDraft, setNotesDraft] = useState(content.editor_notes || '');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  React.useEffect(() => {
    setNotesDraft(content.editor_notes || '');
  }, [content.id, content.editor_notes]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const editor = allUsers.find(u => u.id === content.editor_id);
  const poster = allUsers.find(u => u.id === content.poster_id);

  // Check overdue
  const todayStr = localDateStr();
  const nowTime = new Date().toTimeString().slice(0, 5);
  const isOverduePosting =
    content.status === 'READY_TO_POST' &&
    (content.scheduled_date < todayStr ||
      (content.scheduled_date === todayStr && content.scheduled_time < nowTime));
  // FR-OVERDUE-1: editing is overdue once the scheduled date has passed
  const isOverdueEditing =
    (content.status === 'EDITING' || content.status === 'PLANNED') &&
    content.scheduled_date < todayStr;

  // Admins and Managers edit and manage content
  const managerial = canManageContent(currentUser.role);
  const canDelete = canDeleteContent(currentUser.role);
  const isAssignedCreator = isCreator(currentUser.role) && currentUser.id === content.editor_id;
  const canUploadOrReplace = managerial || (isAssignedCreator && content.status !== 'POSTED');
  const canMarkPosted = managerial || (isPoster(currentUser.role) && currentUser.id === content.poster_id);
  const canStartEditing =
    (isAssignedCreator || managerial) && ['PLANNED', 'REVISION', 'ISSUE'].includes(content.status) && Boolean(onStartEditing);
  const kind = assetKind(content.video_filename || content.video_url);
  const assetNoun = kind === 'video' ? 'Video' : kind === 'image' ? 'Design' : 'File';

  const handleStartEditing = async () => {
    if (!onStartEditing) return;
    setIsStarting(true);
    setActionError(null);
    try {
      await onStartEditing();
    } catch (err: any) {
      setActionError(err.message || 'Could not update status');
    } finally {
      setIsStarting(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!onSaveEditorNotes) return;
    setNotesSaving(true);
    setActionError(null);
    try {
      await onSaveEditorNotes(notesDraft.trim());
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (err: any) {
      setActionError(err.message || 'Could not save notes');
    } finally {
      setNotesSaving(false);
    }
  };

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(content.caption);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleCopyHashtags = async () => {
    try {
      await navigator.clipboard.writeText(content.hashtags);
      setHashtagsCopied(true);
      setTimeout(() => setHashtagsCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const processVideoFile = async (file: File) => {
    if (!file) return;

    // Videos (Video Editors) or images / PDF / ZIP (Graphic Designers)
    const ext = extOf(file.name);
    if (!ext || ![...VIDEO_EXT, ...IMAGE_EXT, '.pdf', '.zip'].includes(ext)) {
      setUploadError('Unsupported file. Upload a video (MP4, MOV, WEBM…), an image (JPG, PNG, WEBP, GIF), a PDF or a ZIP.');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setUploadError('File is larger than the 500MB limit.');
      return;
    }

    setUploadError(null);
    setUploadProgress(0);
    setUploadSuccess(false);

    try {
      await onUploadVideo(file, (percent) => {
        setUploadProgress(percent);
      });
      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        setUploadProgress(null);
      }, 4000);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(`${err.message || 'Upload failed.'} You can retry the upload.`);
      setUploadProgress(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processVideoFile(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canUploadOrReplace) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!canUploadOrReplace) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processVideoFile(file);
    }
  };

  const handleAttachDemo = async () => {
    if (!onAttachSampleVideo) return;
    setIsAttachingSample(true);
    setUploadError(null);
    try {
      await onAttachSampleVideo();
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3500);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to attach sample clip');
    } finally {
      setIsAttachingSample(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-4xl xl:max-w-5xl 2xl:max-w-6xl w-full min-w-0 shadow-2xl border border-slate-200 overflow-hidden h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-start sm:items-center justify-between gap-2 bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
            <PlatformBadge platform={content.platform} />
            <ContentTypeBadge type={content.content_type} />
            <StatusBadge status={content.status} size="md" />
            {isOverduePosting && <OverdueBadge type="posting" />}
            {isOverdueEditing && <OverdueBadge type="editing" />}
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 border-b border-slate-100 flex items-center gap-4 sm:gap-6 text-xs font-semibold shrink-0 bg-slate-50/70 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2.5 border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Publishing Workspace
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'activity'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Activity History</span>
            {activityLogs.length > 0 && (
              <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px]">
                {activityLogs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'issues'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Issues</span>
            {issues.filter(i => i.status === 'OPEN').length > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded-full text-[10px]">
                {issues.filter(i => i.status === 'OPEN').length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden flex-1 min-w-0 space-y-5 sm:space-y-6">
          {activeTab === 'details' && (
            <>
              {/* Title & Schedule */}
              <div>
                <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3 flex-wrap mb-1">
                  <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight break-words min-w-0">
                    {content.title}
                  </h2>
                  {managerial ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                      <Shield className="w-3.5 h-3.5" />
                      <span>{roleLabel(currentUser.role)} — full edit access</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Brief set by Admin / Manager</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Scheduled: {content.scheduled_date}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {content.scheduled_time}
                  </span>
                  {content.description && (
                    <span className="basis-full text-slate-500 italic break-words">
                      {content.description}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Banner for Handoff (Section 47) */}
              {content.status === 'READY_TO_POST' && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                        ✓ Final {assetNoun.toLowerCase()} uploaded — Ready to Post
                      </div>
                      <div className="text-xs text-emerald-700 mt-0.5">
                        Intern: <span className="font-semibold">{poster?.name || 'Not assigned yet'}</span> · Scheduled {content.scheduled_date} at {content.scheduled_time}.
                      </div>
                    </div>
                  </div>

                  {canMarkPosted && (
                  <button
                    onClick={onMarkPostedClick}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors shrink-0"
                    id="btn-mark-posted-banner"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Mark as Posted</span>
                  </button>
                  )}
                </div>
              )}

              {/* Start working (assigned creator) */}
              {canStartEditing && (
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs text-amber-900">
                    <div className="font-bold uppercase tracking-wider">
                      {content.status === 'PLANNED' ? 'Not started yet' : content.status === 'REVISION' ? 'Revision needed' : 'Issue reported'}
                    </div>
                    <div className="mt-0.5">
                      {isAssignedCreator
                        ? 'Let the team know you are working on it. Uploading the final file moves it to Ready to Post.'
                        : `Move this to Editing for ${editor?.name || 'the creator'}.`}
                    </div>
                  </div>
                  <button
                    onClick={handleStartEditing}
                    disabled={isStarting}
                    className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors shrink-0"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>{isStarting ? 'Updating…' : 'Start Working'}</span>
                  </button>
                </div>
              )}

              {actionError && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs font-medium rounded-lg border border-rose-200" role="alert">
                  {actionError}
                </div>
              )}

              {/* Issue Banner if status is ISSUE */}
              {content.status === 'ISSUE' && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                      Issue Reported on This Content
                    </div>
                    <p className="text-xs text-rose-800 font-medium">
                      {content.internal_notes || content.instructions || 'An issue was reported for this item during review. Please fix the issue and upload the corrected file.'}
                    </p>
                    {issues && issues.filter(i => i.status === 'OPEN').length > 0 && (
                      <div className="mt-2 space-y-1">
                        {issues.filter(i => i.status === 'OPEN').map(iss => (
                          <div key={iss.id} className="text-xs text-rose-800 bg-white/90 p-2.5 rounded-lg border border-rose-200/80">
                            <span className="font-semibold">{iss.reporter_name || 'Intern / Reviewer'}:</span> {iss.description}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Revision Banner if status is REVISION */}
              {content.status === 'REVISION' && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-orange-900 uppercase tracking-wider">
                      Revision Requested
                    </div>
                    <p className="text-xs text-orange-800 mt-1">
                      {content.internal_notes || 'Please make the requested changes and re-upload the final file.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Posted Confirmation Banner */}
              {content.status === 'POSTED' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                        Published ✓
                      </div>
                      <div className="text-xs text-blue-700 mt-0.5">
                        Posted by <span className="font-semibold">{allUsers.find(u => u.id === content.posted_by)?.name || 'Team member'}</span>
                        {content.posted_at && <> on {new Date(content.posted_at).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>}
                        {content.post_url && (
                          <span className="block truncate max-w-[320px] font-mono text-[11px] mt-0.5">{content.post_url}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {content.post_url && (
                    <a
                      href={content.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Live Post</span>
                    </a>
                  )}
                </div>
              )}

              {/* Main 2-Column Section: Left = Video & Upload; Right = Copy & Instructions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Video Preview & Actions (5 cols) */}
                <div className="lg:col-span-5 space-y-4 min-w-0">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`bg-slate-900 rounded-2xl overflow-hidden shadow-md border transition-all duration-200 flex flex-col items-center justify-center relative min-h-[220px] sm:min-h-[300px] ${
                      isDragging 
                        ? 'border-blue-500 ring-4 ring-blue-500/20 bg-slate-800' 
                        : 'border-slate-800'
                    }`}
                  >
                    {isDragging && (
                      <div className="absolute inset-0 bg-blue-600/90 z-30 flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-150">
                        <UploadCloud className="w-12 h-12 mb-2 animate-bounce" />
                        <span className="text-base font-bold">Drop the final file here</span>
                        <span className="text-xs text-blue-100 mt-1">Video, image, PDF or ZIP</span>
                      </div>
                    )}

                    {content.video_url && kind === 'video' ? (
                      <video
                        key={content.video_url}
                        src={content.video_url}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full max-h-[380px] bg-black object-contain"
                      />
                    ) : content.video_url && kind === 'image' ? (
                      <img
                        key={content.video_url}
                        src={content.video_url}
                        alt={content.video_filename || 'Final design'}
                        loading="lazy"
                        className="w-full max-h-[380px] bg-black object-contain"
                      />
                    ) : content.video_url && kind === 'pdf' ? (
                      <iframe
                        key={content.video_url}
                        src={content.video_url}
                        title={content.video_filename || 'Final PDF'}
                        className="w-full h-[380px] bg-white"
                      />
                    ) : content.video_url ? (
                      <div className="p-8 text-center text-slate-300 w-full flex flex-col items-center justify-center">
                        {kind === 'zip' ? <FileArchive className="w-12 h-12 text-slate-500 mb-2" /> : <FileImage className="w-12 h-12 text-slate-500 mb-2" />}
                        <p className="text-sm font-medium">{content.video_filename}</p>
                        <p className="text-xs text-slate-500 mt-1">No preview for this file type — use Download.</p>
                      </div>
                    ) : (
                      <div 
                        onClick={() => canUploadOrReplace && fileInputRef.current?.click()}
                        className={`p-8 text-center text-slate-400 w-full h-full flex flex-col items-center justify-center ${
                          canUploadOrReplace ? 'cursor-pointer hover:bg-slate-800/60 transition-colors' : ''
                        }`}
                      >
                        <FileVideo className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                        <p className="text-sm font-medium text-slate-300">No final file uploaded yet</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {canUploadOrReplace
                            ? 'Click or drag & drop the final video / design to upload'
                            : `Assigned to ${editor?.name || 'the creator'} (${roleLabel(editor?.role)})`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Video Metadata Box */}
                  {content.video_url && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">File:</span>
                        <span className="font-mono text-slate-900 truncate max-w-[200px]">
                          {content.video_filename || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">Size:</span>
                        <span className="text-slate-900">{formatFileSize(content.video_filesize)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">Uploaded by:</span>
                        <span className="text-slate-900">
                          {allUsers.find(u => u.id === content.video_uploaded_by)?.name || '—'}
                        </span>
                      </div>
                      {content.video_uploaded_at && (
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Uploaded at:</span>
                          <span className="text-slate-900">
                            {new Date(content.video_uploaded_at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Primary Video Actions: DOWNLOAD & UPLOAD/REPLACE */}
                  <div className="space-y-2">
                    {content.video_url && (
                      <a
                        href={content.video_url.endsWith('/download') ? content.video_url : `${content.video_url}/download`}
                        download={content.video_filename || 'contentflow_file'}
                        className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-sm transition-all"
                        id="btn-download-video"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download {assetNoun}</span>
                      </a>
                    )}

                    {canUploadOrReplace && (
                      <div className="space-y-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept={ACCEPT_ATTR}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={`w-full inline-flex items-center justify-center gap-2 border font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all ${
                            content.video_url
                              ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                              : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-500 shadow-sm'
                          }`}
                          id="btn-upload-video"
                        >
                          <UploadCloud className="w-4 h-4" />
                          <span>{content.video_url ? `Replace ${assetNoun}` : 'Upload Final File'}</span>
                        </button>

                        {/* Quick sample reel attachment for fast testing */}
                        {onAttachSampleVideo && (
                          <button
                            type="button"
                            onClick={handleAttachDemo}
                            disabled={isAttachingSample || uploadProgress !== null}
                            className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium py-1 transition-colors disabled:opacity-50 cursor-pointer"
                            id="btn-attach-sample-video"
                          >
                            {isAttachingSample ? 'Attaching demo clip...' : '⚡ Or attach demo sample video'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Upload progress indicator */}
                    {uploadProgress !== null && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                          <span>Uploading…</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2 transition-all duration-150"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {uploadSuccess && (
                      <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 text-center flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Uploaded ✓ Status is now Ready to Post</span>
                      </div>
                    )}

                    {uploadError && (
                      <div className="p-2.5 bg-rose-50 text-rose-700 text-xs font-medium rounded-lg border border-rose-200 text-center">
                        {uploadError}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Information, Copyables & Instructions (7 cols) */}
                <div className="lg:col-span-7 space-y-4 min-w-0">
                  {/* Responsibility cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Designer / Editor
                      </span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <UserAvatar user={editor} size="sm" />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            {editor?.name || 'Unassigned'}
                          </span>
                          <span className="text-[10px] text-slate-500">{editor ? roleLabel(editor.role) : '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Intern
                      </span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <UserAvatar user={poster} size="sm" />
                        <div>
                          <span className={`text-xs font-bold block ${poster ? 'text-slate-800' : 'text-amber-700'}`}>
                            {poster?.name || 'Not assigned yet'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {poster
                              ? `Publishes on ${content.platform.replace('_', ' ')}`
                              : managerial ? 'Use Edit to assign an intern' : 'An Admin or Manager will assign one'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Caption Box */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        Caption
                      </span>
                      <button
                        onClick={handleCopyCaption}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          captionCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                        id="btn-copy-caption"
                      >
                        {captionCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Caption copied ✓</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy Caption</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-3.5 text-xs sm:text-sm text-slate-800 font-normal whitespace-pre-line leading-relaxed max-h-44 overflow-y-auto">
                      {content.caption || 'No caption provided.'}
                    </div>
                  </div>

                  {/* Hashtags Box */}
                  {content.hashtags && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Hashtags
                        </span>
                        <button
                          onClick={handleCopyHashtags}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                            hashtagsCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                          id="btn-copy-hashtags"
                        >
                          {hashtagsCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Hashtags copied ✓</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copy Hashtags</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-3 text-xs sm:text-sm text-slate-700 font-mono">
                        {content.hashtags}
                      </div>
                    </div>
                  )}

                  {/* Posting Instructions */}
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Posting Instructions
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {content.instructions || 'No posting instructions.'}
                    </p>
                  </div>

                  {/* Brief / reference for the creator */}
                  {content.reference_notes && (managerial || isAssignedCreator) && (
                    <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Brief / Reference</span>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line break-words">{content.reference_notes}</p>
                    </div>
                  )}

                  {/* Creator notes (FR-EDIT-5) */}
                  {isAssignedCreator && onSaveEditorNotes ? (
                    <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <StickyNote className="w-3.5 h-3.5 text-slate-400" />
                        My notes for the team
                      </span>
                      <textarea
                        rows={2}
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="e.g. Used the brand template v2. Cover frame at 0:03."
                        className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg p-2 text-xs text-slate-900 outline-none"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveNotes}
                          disabled={notesSaving || notesDraft.trim() === (content.editor_notes || '')}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
                        >
                          {notesSaving ? 'Saving…' : notesSaved ? 'Saved ✓' : 'Save notes'}
                        </button>
                      </div>
                    </div>
                  ) : content.editor_notes ? (
                    <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                        Notes from {editor?.name || 'the creator'}
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{content.editor_notes}</p>
                    </div>
                  ) : null}

                  {/* Workflow Action Bar */}
                  <div className="pt-2 flex items-center justify-between gap-2 flex-wrap border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={onReportIssueClick}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors border border-rose-200"
                        id="btn-report-issue"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Report Issue</span>
                      </button>

                      {managerial && content.status !== 'POSTED' && (
                        <button
                          onClick={onRequestRevisionClick}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 hover:text-orange-800 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors border border-orange-200"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Request Revision</span>
                        </button>
                      )}
                    </div>

                    {/* Management & Delete actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {managerial && (() => {
                        // Goes to the WhatsApp of whoever created the ticket (else your own, else pick a chat)
                        const creator = allUsers.find(u => u.id === content.created_by);
                        const target = whatsappDigits(creator?.whatsapp) ? creator : whatsappDigits(currentUser.whatsapp) ? currentUser : undefined;
                        const label = target
                          ? `Send this ticket to ${target.id === currentUser.id ? 'your' : `${target.name}'s`} WhatsApp`
                          : 'Share this ticket on WhatsApp';
                        return (
                          <a
                            href={whatsappLink(target?.whatsapp, ticketMessage(content, allUsers))}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={label}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                            id="btn-whatsapp-ticket"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        );
                      })()}
                      {managerial && onEditClick && (
                        <button
                          onClick={onEditClick}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                      {managerial && (
                        <>
                          <button
                            onClick={onMoveDateClick}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Reschedule</span>
                          </button>
                          <button
                            onClick={onDuplicateClick}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200"
                          >
                            <CopyCheck className="w-3.5 h-3.5" />
                            <span>Duplicate</span>
                          </button>
                        </>
                      )}
                      {canDelete && (
                        <button
                          onClick={onDeleteClick}
                          className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors"
                          id="btn-delete-task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Task</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Activity History Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Chronological Activity Trail
              </h4>
              {activityLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No activity recorded for this content item yet.
                </div>
              ) : (
                <div className="relative border-l border-slate-200 ml-3 pl-4 space-y-4">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 ring-4 ring-white" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          {log.description}
                        </p>
                        <span className="text-[11px] text-slate-400">
                          {new Date(log.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Issues Tab */}
          {activeTab === 'issues' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Reported Problems
                </h4>
                <button
                  onClick={onReportIssueClick}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                >
                  + Report New Problem
                </button>
              </div>

              {issues.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  ✓ No issues reported.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {issues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                        issue.status === 'OPEN'
                          ? 'bg-rose-50/70 border-rose-200'
                          : 'bg-slate-50 border-slate-200 opacity-75'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              issue.status === 'OPEN'
                                ? 'bg-rose-200 text-rose-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {issue.status}
                          </span>
                          <span className="text-xs font-bold text-slate-800 capitalize">
                            {issue.issue_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1">{issue.description}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Reported by {issue.reporter_name || 'Team member'} on{' '}
                          {new Date(issue.created_at).toLocaleString([], {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {issue.status === 'OPEN' && managerial && (
                        <button
                          onClick={() => onResolveIssue(issue.id)}
                          className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs shrink-0 transition-colors"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
