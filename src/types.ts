// Role keys stored in the database.
//  admin            → Admin (full content, team, settings & workspace control)
//  manager          → Manager / DMM (full content control, no team/settings changes)
//  graphic_designer → Graphic Designer (creator: designs carousels, static posts, stories)
//  editor           → Video Editor (creator: edits and uploads final videos)
//  poster           → Intern (posting intern: downloads, publishes, marks posted)
export type UserRole =
  | 'admin'
  | 'manager'
  | 'graphic_designer'
  | 'editor'
  | 'poster';

export type UserStatus = 'active' | 'disabled';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  status: UserStatus;
  /** True when the account can also sign in with email + password. */
  has_password?: boolean;
  /** The user must choose their own password at next sign-in (temporary/default password). */
  must_change_password?: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export type ContentStatus = 
  | 'PLANNED'
  | 'EDITING'
  | 'READY_TO_POST'
  | 'POSTED'
  | 'REVISION'
  | 'ISSUE';

export type ContentType = 
  | 'reel'
  | 'short'
  | 'carousel'
  | 'static'
  | 'story'
  | 'thread'
  | 'announcement'
  | 'other';

export type Platform = 
  | 'instagram'
  | 'tiktok'
  | 'youtube_shorts'
  | 'linkedin'
  | 'x'
  | 'facebook';

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  content_type: ContentType;
  platform: Platform;
  category?: string;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string; // HH:mm
  editor_id: string;
  poster_id: string;
  caption: string;
  hashtags: string;
  instructions: string;
  video_url?: string;
  video_filename?: string;
  video_filesize?: number;
  video_uploaded_at?: string;
  video_uploaded_by?: string;
  thumbnail_url?: string;
  status: ContentStatus;
  post_url?: string;
  posted_at?: string;
  posted_by?: string;
  posting_notes?: string;
  reference_file_url?: string;
  reference_notes?: string;
  internal_notes?: string;
  /** Notes added by the assigned Graphic Designer / Video Editor (FR-EDIT-5). */
  editor_notes?: string;
  tags?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  content_id?: string;
  user_id: string;
  user_name?: string;
  user_role?: UserRole;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export type IssueType = 
  | 'video_not_downloading'
  | 'wrong_video'
  | 'caption_issue'
  | 'video_editing_problem'
  | 'platform_issue'
  | 'cannot_publish'
  | 'other';

export interface ContentIssue {
  id: string;
  content_id: string;
  content_title?: string;
  reported_by: string;
  reporter_name?: string;
  issue_type: IssueType;
  description: string;
  status: 'OPEN' | 'RESOLVED';
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  content_id?: string;
  read: boolean;
  type?: 'ready_to_post' | 'revision' | 'overdue' | 'issue' | 'assigned' | 'posted' | 'general';
  created_at: string;
}

export interface OperationalMetrics {
  total: number;
  planned: number;
  editing: number;
  ready_to_post: number;
  posted: number;
  revision: number;
  issue: number;
  overdue_editing: number;
  overdue_posting: number;
  today_count: number;
}

export interface WorkspaceSettings {
  workspace_name: string;
  default_timezone: string;
  default_platform: Platform;
  allow_editor_replace: boolean;
  notification_email: boolean;
  auto_cleanup_enabled?: boolean;
  retention_days?: number;
}
