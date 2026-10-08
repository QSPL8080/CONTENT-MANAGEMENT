import { 
  User, 
  ContentItem, 
  ActivityLog, 
  ContentIssue, 
  AppNotification, 
  OperationalMetrics, 
  WorkspaceSettings,
  ContentStatus 
} from '../types';

// Sessions use an httpOnly cookie set by the server — the browser sends it automatically
// on every same-origin request, so no user id is ever sent from the client.

/** Called whenever the server says the session is gone (401) so the app can show the sign-in screen. */
let unauthorizedHandler: (() => void) | null = null;
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  // While the server is starting up (just deployed / waking up) it answers 503 for a few
  // seconds — wait and try again quietly instead of showing an error.
  const retryDelays = [1000, 2000, 3000, 4000, 5000, 5000];
  for (let attempt = 0; ; attempt++) {
    try {
      response = await fetch(endpoint, {
        ...options,
        headers,
        credentials: 'same-origin',
      });
    } catch {
      throw new ApiError('Network error — check your internet connection and try again.', 0);
    }
    const retriable = response.status === 503 || response.status === 502 || response.status === 504;
    if (!retriable || attempt >= retryDelays.length || options.body instanceof FormData) break;
    await new Promise(r => setTimeout(r, retryDelays[attempt]));
  }

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.error) errorMsg = errJson.error;
    } catch {
      // fallback to status text
    }
    // A 401 on the initial "am I signed in?" check just means "not signed in yet" — not a lost session
    if (response.status === 401 && !endpoint.startsWith('/api/auth/login') && !endpoint.startsWith('/api/auth/me')) {
      unauthorizedHandler?.();
    }
    throw new ApiError(errorMsg, response.status);
  }

  return response.json();
}

export const api = {
  // Auth
  getAuthConfig: () =>
    request<{ workspaceName: string }>('/api/auth/config'),
  getMe: () =>
    request<{ user: User }>('/api/auth/me'),
  login: (credentials: { email: string; password: string }) =>
    request<{ success: boolean; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  changePassword: (current_password: string, new_password: string) =>
    request<{ success: boolean; user: User }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),
  logout: () => request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  // Users
  getUsers: () => request<{ users: User[] }>('/api/users'),
  createUser: (userData: Partial<User> & { password?: string }) => 
    request<{ user: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  revealPassword: (id: string) => request<{ password: string }>(`/api/users/${id}/password`),
  deleteUser: (id: string) => request<{ success: boolean }>(`/api/users/${id}`, { method: 'DELETE' }),
  updateUser: (id: string, updates: Partial<User> & { password?: string }) =>
    request<{ user: User }>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),


  // Metrics
  getMetrics: () => request<OperationalMetrics>('/api/metrics'),

  // Content
  getContent: (filters?: {
    status?: string;
    editor_id?: string;
    poster_id?: string;
    platform?: string;
    date?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, v);
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<{ content: ContentItem[] }>(`/api/content${query}`);
  },

  getContentById: (id: string) =>
    request<{
      content: ContentItem;
      activity_logs: ActivityLog[];
      issues: ContentIssue[];
    }>(`/api/content/${id}`),

  createContent: (data: Partial<ContentItem>) =>
    request<{ content: ContentItem }>('/api/content', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateContent: (id: string, data: Partial<ContentItem>) =>
    request<{ content: ContentItem }>(`/api/content/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  uploadVideo: async (
    contentId: string, 
    file: File, 
    onProgress?: (percent: number) => void
  ): Promise<{ content: ContentItem; file?: any }> => {
    // If file is > 15MB, use chunked upload to completely bypass proxy body size limits (e.g. 32MB)
    if (file.size > 15 * 1024 * 1024) {
      return uploadVideoChunked(contentId, file, onProgress);
    }

    try {
      // Attempt direct upload for smaller files
      return await uploadVideoDirect(contentId, file, onProgress);
    } catch (err: any) {
      console.warn('Direct upload failed, falling back to chunked upload:', err?.message);
      // Fallback automatically to chunked upload if direct was blocked or failed
      return await uploadVideoChunked(contentId, file, onProgress);
    }
  },

  attachSampleVideo: (contentId: string) =>
    request<{ success: boolean; content: ContentItem }>(`/api/content/${contentId}/attach-sample-video`, {
      method: 'POST',
    }),

  markPosted: (contentId: string, data: {
    post_url?: string;
    posted_at?: string;
    posting_notes?: string;
    platform?: string;
  }) =>
    request<{ success: boolean; content: ContentItem }>(`/api/content/${contentId}/mark-posted`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  requestRevision: (contentId: string, notes: string) =>
    request<{ success: boolean; content: ContentItem }>(`/api/content/${contentId}/revision`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),

  reportIssue: (contentId: string, data: { issue_type: string; description: string }) =>
    request<{ success: boolean; issue: ContentIssue }>(`/api/content/${contentId}/report-issue`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  duplicateContent: (contentId: string) =>
    request<{ success: boolean; content: ContentItem }>(`/api/content/${contentId}/duplicate`, {
      method: 'POST',
    }),

  deleteContent: (contentId: string) =>
    request<{ success: boolean }>(`/api/content/${contentId}`, {
      method: 'DELETE',
    }),

  // Issues
  getIssues: (contentId?: string) => {
    const query = contentId ? `?content_id=${contentId}` : '';
    return request<{ issues: ContentIssue[] }>(`/api/issues${query}`);
  },
  resolveIssue: (issueId: string) =>
    request<{ success: boolean; issue: ContentIssue }>(`/api/issues/${issueId}/resolve`, {
      method: 'PATCH',
    }),

  // Activity
  getActivity: (contentId?: string) => {
    const query = contentId ? `?content_id=${contentId}` : '';
    return request<{ activity_logs: ActivityLog[] }>(`/api/activity${query}`);
  },
  /** Activity newer than `since` (ISO time) — used for the Admin's live desktop pop-ups. */
  getActivitySince: (since: string, limit = 30) =>
    request<{ activity_logs: ActivityLog[] }>(`/api/activity?since=${encodeURIComponent(since)}&limit=${limit}`),

  // Notifications
  getNotifications: () =>
    request<{ notifications: AppNotification[] }>('/api/notifications'),
  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    }),
  // Pop-ups missed while ContentOps was closed (marks them as shown)
  getMissedPopups: () =>
    request<{ now: string; items: { id: string; title: string; message: string; type?: AppNotification['type']; content_id?: string | null; created_at?: string }[] }>(
      '/api/popups/missed', { method: 'POST' }
    ),
  markPopupSeen: (kind: 'activity' | 'notification', id: string) =>
    request<{ success: boolean }>('/api/popups/seen', {
      method: 'POST',
      body: JSON.stringify({ kind, id }),
    }),
  markAllNotificationsRead: () =>
    request<{ success: boolean }>('/api/notifications/read-all', {
      method: 'POST',
    }),

  // Settings
  getSettings: () =>
    request<{ settings: WorkspaceSettings; now?: { date: string; time: string }}>('/api/settings'),
  updateSettings: (settings: Partial<WorkspaceSettings>) =>
    request<{ settings: WorkspaceSettings }>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }),
  getStorageStats: () =>
    request<{
      totalDiskUsageBytes: number;
      totalDiskFilesCount: number;
      eligibleItemsCount: number;
      reclaimableBytes: number;
      retentionDays: number;
      cutoffDate: string;
    }>('/api/settings/storage-stats'),
  runStorageCleanup: (retentionDays?: number) =>
    request<{
      success: boolean;
      filesDeleted: number;
      bytesFreed: number;
      chunksCleaned: number;
      itemsUpdated: number;
      retentionDays: number;
      cutoffDate: string;
    }>('/api/settings/cleanup', {
      method: 'POST',
      body: JSON.stringify({ retention_days: retentionDays }),
    }),
};

// --- Resilient Video Upload Internals ---

async function uploadVideoDirect(
  contentId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ content: ContentItem; file?: any }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('video', file);

    xhr.open('POST', `/api/content/${contentId}/upload-video`, true);
    xhr.withCredentials = true;

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch {
          reject(new Error('Invalid server response format'));
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          reject(new Error(data.error || `Upload failed with status ${xhr.status}`));
        } catch {
          if (xhr.status === 413) {
            reject(new Error('File size exceeds single request limit'));
          } else {
            reject(new Error(`Upload failed (${xhr.status}): ${xhr.statusText || 'Server error'}`));
          }
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload — check your connection and retry.'));
    xhr.ontimeout = () => reject(new Error('Direct upload request timed out'));
    xhr.send(formData);
  });
}

async function uploadVideoChunked(
  contentId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ content: ContentItem; file?: any }> {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB slices
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  let finalResult: any = null;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunkBlob = file.slice(start, end);

    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', String(chunkIndex));
    formData.append('totalChunks', String(totalChunks));
    formData.append('filename', file.name);
    formData.append('filesize', String(file.size));
    formData.append('chunk', chunkBlob, file.name);

    // Send chunk with retry on transient failure
    const sendChunk = async (attempt = 1): Promise<any> => {
      return new Promise((resolve, reject) => {
        const queryParams = new URLSearchParams({
          uploadId,
          chunkIndex: String(chunkIndex),
          totalChunks: String(totalChunks),
          filename: file.name,
          filesize: String(file.size),
        });
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/content/${contentId}/upload-chunk?${queryParams.toString()}`, true);
        xhr.withCredentials = true;

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const currentChunkBytes = event.loaded;
              const totalLoaded = start + currentChunkBytes;
              const percent = Math.min(99, Math.round((totalLoaded / file.size) * 100));
              onProgress(percent);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error('Invalid chunk response from server'));
            }
          } else {
            try {
              const errData = JSON.parse(xhr.responseText);
              reject(new Error(errData.error || `Chunk error (${xhr.status})`));
            } catch {
              reject(new Error(`Chunk upload failed with status ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => {
          if (attempt <= 2) {
            console.warn(`Retry chunk ${chunkIndex + 1} attempt ${attempt + 1}...`);
            setTimeout(() => sendChunk(attempt + 1).then(resolve).catch(reject), 800);
          } else {
            reject(new Error(`Network error while uploading part ${chunkIndex + 1} of ${totalChunks}`));
          }
        };

        xhr.send(formData);
      });
    };

    const chunkRes = await sendChunk();
    if (chunkIndex === totalChunks - 1) {
      finalResult = chunkRes;
    }
  }

  if (onProgress) {
    onProgress(100);
  }

  return finalResult;
}
