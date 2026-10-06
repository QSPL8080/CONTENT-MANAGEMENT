import fs from 'fs';
import path from 'path';
import { pool } from './db';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
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

  // Find all content items with media older than cutoff date
  // Either scheduled_date < cutoffDate OR video_uploaded_at < cutoff
  const { rows } = await pool.query(
    `SELECT id, title, video_url, video_filename, video_filesize, scheduled_date, video_uploaded_at
       FROM content_items
      WHERE (scheduled_date < $1 OR (video_uploaded_at IS NOT NULL AND video_uploaded_at < $2))
        AND (video_url IS NOT NULL OR video_filename IS NOT NULL)`,
    [cutoffDateStr, cutoff.toISOString()]
  );

  let filesDeleted = 0;
  let bytesFreed = 0;
  let itemsUpdated = 0;
  const purgedItems: { id: string; title: string; filename?: string; bytes?: number }[] = [];

  for (const item of rows) {
    let rawFilename = item.video_filename;
    if (!rawFilename && item.video_url) {
      rawFilename = path.basename(item.video_url.replace('/download', ''));
    }

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

  const { totalBytes, totalFiles } = getDirStats(UPLOADS_DIR);

  const { rows } = await pool.query(
    `SELECT id, video_url, video_filename, video_filesize
       FROM content_items
      WHERE (scheduled_date < $1 OR (video_uploaded_at IS NOT NULL AND video_uploaded_at < $2))
        AND (video_url IS NOT NULL OR video_filename IS NOT NULL)`,
    [cutoffDateStr, cutoff.toISOString()]
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
