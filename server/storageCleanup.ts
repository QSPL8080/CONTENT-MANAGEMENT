import fs from 'fs';
import path from 'path';
import { pool } from './db';

import { UPLOADS_DIR } from './paths';
import { r2Enabled, r2Delete, r2Usage, r2PutFile } from './fileStore';
const TEMP_UPLOADS_DIR = path.join(UPLOADS_DIR, 'temp_chunks');

export interface CleanupResult {
  success: boolean;
  filesDeleted: number;
  bytesFreed: number;
  chunksCleaned: number;
  itemsUpdated: number;
  retentionDays: number;
  cutoffDate: string;
  purgedItems: { id: string; title: string; filename?: string; bytes?: number }[];
}

export interface StorageStats {
  totalDiskUsageBytes: number;
  totalDiskFilesCount: number;
  eligibleItemsCount: number;
  reclaimableBytes: number;
  retentionDays: number;
  cutoffDate: string;
}

/**
 * Calculates directory size recursively.
 */
function getDirStats(dirPath: string): { totalBytes: number; totalFiles: number } {
  let totalBytes = 0;
  let totalFiles = 0;

  if (!fs.existsSync(dirPath)) return { totalBytes: 0, totalFiles: 0 };

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    try {
      if (entry.isDirectory()) {
        const sub = getDirStats(fullPath);
        totalBytes += sub.totalBytes;
        totalFiles += sub.totalFiles;
      } else if (entry.isFile()) {
        totalBytes += fs.statSync(fullPath).size;
        totalFiles += 1;
      }
    } catch {
      // ignore concurrent file locks
    }
  }

  return { totalBytes, totalFiles };
}

/**
 * Clean up orphan chunks in temp_chunks folder older than 24 hours.
 */
function cleanStaleChunks(): number {
  if (!fs.existsSync(TEMP_UPLOADS_DIR)) return 0;
  let cleanedCount = 0;
  const now = Date.now();
  const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours

  try {
    const entries = fs.readdirSync(TEMP_UPLOADS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(TEMP_UPLOADS_DIR, entry.name);
      try {
        const stats = fs.statSync(fullPath);
        if (now - stats.mtimeMs > maxAgeMs) {
          if (entry.isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(fullPath);
          }
          cleanedCount++;
        }
      } catch {}
    }
  } catch {}

  return cleanedCount;
}

/**
 * Executes the 90-day (or custom retention days) storage cleanup lifecycle.
 */
export async function runStorageLifecycleCleanup(retentionDays = 90): Promise<CleanupResult> {
  const days = Math.max(1, retentionDays);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const cutoffDateStr = cutoff.toISOString().slice(0, 10);

  // Clean stale temp chunks first
  const chunksCleaned = cleanStaleChunks();

  // Uploaded files (videos, designs, PDFs, ZIPs) of tasks whose scheduled post date is more
  // than `days` days ago. The task itself is kept as a record; only the file is deleted.
  const { rows } = await pool.query(
    `SELECT id, title, video_url, video_filename, video_filesize, scheduled_date, video_uploaded_at
       FROM content_items
      WHERE scheduled_date < $1
        AND (video_url IS NOT NULL OR video_filename IS NOT NULL)`,
    [cutoffDateStr]
  );

  let filesDeleted = 0;
  let bytesFreed = 0;
  let itemsUpdated = 0;
  const purgedItems: { id: string; title: string; filename?: string; bytes?: number }[] = [];

  for (const item of rows) {
    // The stored file name is in video_url (/api/videos/<stored name>); video_filename is the
    // original name the person uploaded, so it is only a fallback.
    let rawFilename = item.video_url
      ? path.basename(String(item.video_url).replace(/\/download$/, ''))
      : item.video_filename;
    if (rawFilename && path.basename(rawFilename).startsWith('sample-reel-')) rawFilename = null; // bundled demo clips

    let freedForItem = 0;
    if (rawFilename) {
      const sanitized = path.basename(rawFilename);
      const filePath = path.join(UPLOADS_DIR, sanitized);
      if (fs.existsSync(filePath)) {
        try {
          const stats = fs.statSync(filePath);
          freedForItem = stats.size;
          fs.unlinkSync(filePath);
          filesDeleted++;
          bytesFreed += freedForItem;
        } catch (err: any) {
          console.warn(`[Storage Lifecycle] Could not delete file ${filePath}: ${err.message}`);
        }
      } else if (r2Enabled()) {
        // Stored in Cloudflare R2
        freedForItem = await r2Delete(sanitized);
        if (freedForItem > 0) {
          filesDeleted++;
          bytesFreed += freedForItem;
        }
      }
    }

    // Update database record: remove media references & record lifecycle notice
    try {
      await pool.query(
        `UPDATE content_items
            SET video_url = NULL,
                video_filename = NULL,
                video_filesize = NULL,
                editor_notes = CASE 
                  WHEN editor_notes IS NULL OR editor_notes = '' 
                  THEN '[Storage Lifecycle]: Media auto-purged per ${days}-day retention policy'
                  ELSE editor_notes || E'\n[Storage Lifecycle]: Media auto-purged per ${days}-day retention policy'
                END,
                updated_at = NOW()
          WHERE id = $1`,
        [item.id]
      );
      itemsUpdated++;
      purgedItems.push({
        id: item.id,
        title: item.title,
        filename: rawFilename,
        bytes: freedForItem,
      });

      // Log activity
      await pool.query(
        `INSERT INTO activity_logs (id, content_id, user_id, user_name, user_role, action, description)
         VALUES ($1, $2, 'system', 'Storage Lifecycle', 'system', 'storage_cleanup', $3)`,
        [
          `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          item.id,
          `Auto-purged media file for "${item.title}" per ${days}-day storage retention policy.`,
        ]
      );
    } catch (err: any) {
      console.error(`[Storage Lifecycle] Failed to update content row ${item.id}:`, err);
    }
  }

  return {
    success: true,
    filesDeleted,
    bytesFreed,
    chunksCleaned,
    itemsUpdated,
    retentionDays: days,
    cutoffDate: cutoffDateStr,
    purgedItems,
  };
}

/**
 * Returns current disk storage statistics & eligible purge estimate.
 */
export async function getStorageUsageStats(retentionDays = 90): Promise<StorageStats> {
  const days = Math.max(1, retentionDays);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const cutoffDateStr = cutoff.toISOString().slice(0, 10);

  const local = getDirStats(UPLOADS_DIR);
  let totalBytes = local.totalBytes;
  let totalFiles = local.totalFiles;
  if (r2Enabled()) {
    try {
      const r2 = await r2Usage();
      totalBytes += r2.bytes;
      totalFiles += r2.files;
    } catch (err: any) {
      console.warn(`[Storage] Could not read Cloudflare R2 usage: ${err.message}`);
    }
  }

  const { rows } = await pool.query(
    `SELECT id, video_url, video_filename, video_filesize
       FROM content_items
      WHERE scheduled_date < $1
        AND (video_url IS NOT NULL OR video_filename IS NOT NULL)`,
    [cutoffDateStr]
  );

  let reclaimableBytes = 0;
  for (const item of rows) {
    if (item.video_filesize) {
      reclaimableBytes += Number(item.video_filesize);
    } else if (item.video_filename) {
      const p = path.join(UPLOADS_DIR, path.basename(item.video_filename));
      if (fs.existsSync(p)) {
        try {
          reclaimableBytes += fs.statSync(p).size;
        } catch {}
      }
    }
  }

  return {
    totalDiskUsageBytes: totalBytes,
    totalDiskFilesCount: totalFiles,
    eligibleItemsCount: rows.length,
    reclaimableBytes,
    retentionDays: days,
    cutoffDate: cutoffDateStr,
  };
}

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime', '.qt': 'video/quicktime',
  '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo', '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv', '.3gp': 'video/3gpp', '.ts': 'video/mp2t', '.mts': 'video/mp2t', '.m2ts': 'video/mp2t',
  '.ogv': 'video/ogg', '.ogg': 'video/ogg',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.pdf': 'application/pdf', '.zip': 'application/zip',
};

let migrating = false;
/**
 * Cloudflare R2 is the storage: moves every uploaded file still on this server (Hostinger) into
 * R2 and then deletes it from the server. Files no task uses any more are just deleted.
 * Bundled demo clips (sample-reel-*) stay. Safe to run again — it only touches what's left.
 */
export async function moveServerFilesToR2(): Promise<{ moved: number; removed: number; bytes: number; failed: number }> {
  const result = { moved: 0, removed: 0, bytes: 0, failed: 0 };
  if (!r2Enabled() || migrating || !fs.existsSync(UPLOADS_DIR)) return result;
  migrating = true;
  try {
    const files = fs.readdirSync(UPLOADS_DIR, { withFileTypes: true })
      .filter(e => e.isFile() && !e.name.startsWith('sample-reel-') && !e.name.startsWith('.'))
      .map(e => e.name);
    for (const name of files) {
      const localPath = path.join(UPLOADS_DIR, name);
      try {
        const stat = fs.statSync(localPath);
        if (Date.now() - stat.mtimeMs < 10 * 60 * 1000) continue; // may still be in use — next run
        const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM content_items WHERE video_url = $1', [`/api/videos/${name}`]);
        if (rows[0]?.n > 0) {
          await r2PutFile(localPath, name, MIME[path.extname(name).toLowerCase()] || 'application/octet-stream');
          result.moved++;
        } else {
          result.removed++; // no task uses it (e.g. a replaced file)
        }
        fs.unlinkSync(localPath);
        result.bytes += stat.size;
      } catch (err: any) {
        result.failed++;
        console.warn(`[Storage] Could not move ${name} to Cloudflare R2: ${err.message}`);
      }
    }
    if (result.moved || result.removed || result.failed) {
      console.log(
        `☁️  [Storage] Moved ${result.moved} file(s) to Cloudflare R2, removed ${result.removed} unused — ` +
        `${(result.bytes / (1024 * 1024)).toFixed(1)} MB freed on the server` +
        (result.failed ? `; ${result.failed} will be retried` : '')
      );
    }
  } finally {
    migrating = false;
  }
  return result;
}

/**
 * Starts the automated background scheduler (runs daily at 24h interval).
 */
export function startStorageLifecycleScheduler() {
  const checkAndRun = async () => {
    try {
      const { rows } = await pool.query('SELECT auto_cleanup_enabled, retention_days FROM settings LIMIT 1');
      const settings = rows[0];
      const isEnabled = settings ? settings.auto_cleanup_enabled !== false : true;
      const days = settings && settings.retention_days ? Number(settings.retention_days) : 90;

      // Anything still on the server goes to Cloudflare R2 (retries what failed last time)
      await moveServerFilesToR2().catch(err => console.warn(`[Storage] Move to R2 skipped: ${err.message}`));

      if (!isEnabled) {
        console.log('[Storage Lifecycle]: 90-day auto-cleanup is currently disabled in settings.');
        return;
      }

      console.log(`🧹 [Storage Lifecycle]: Running scheduled ${days}-day auto-delete storage cleanup...`);
      const result = await runStorageLifecycleCleanup(days);
      const mbFreed = (result.bytesFreed / (1024 * 1024)).toFixed(2);
      console.log(
        `✅ [Storage Lifecycle]: Completed. Freed ${mbFreed} MB across ${result.filesDeleted} files (${result.chunksCleaned} stale chunks removed).`
      );
    } catch (err: any) {
      console.error('[Storage Lifecycle] Scheduled cleanup error:', err);
    }
  };

  // Run initial check 15 seconds after server boot
  setTimeout(checkAndRun, 15000);

  // Repeat every 24 hours
  setInterval(checkAndRun, 24 * 60 * 60 * 1000);
}
