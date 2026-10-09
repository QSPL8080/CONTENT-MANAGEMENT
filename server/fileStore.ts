import fs from 'fs';
import {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cloudflare R2 storage for uploaded designs and videos.
 *
 * Quickupp's bucket is built in (account below, bucket "quickuppcms-uploads"). It switches on
 * as soon as the two keys are set on the server (Hostinger → Environment variables):
 *   R2_ACCESS_KEY_ID      R2 API token → Access Key ID
 *   R2_SECRET_ACCESS_KEY  R2 API token → Secret Access Key
 * Optional overrides: R2_ACCOUNT_ID, R2_BUCKET, R2_ENDPOINT (another S3-compatible endpoint).
 *
 * When they are not set, files keep going to the server's uploads folder (UPLOADS_DIR).
 * Files uploaded before R2 was switched on stay where they are and keep working.
 *
 * Uploads go straight from the browser to R2 in 10 MB parts (the server only signs the
 * requests), so big videos don't pass through — or fill up — the Hostinger server.
 * Viewing/downloading: the server checks the person may see the task, then sends them to a
 * private link that works for 1 hour.
 */

const PREFIX = 'uploads/';
const DEFAULT_ACCOUNT_ID = '314b20b9b41e428050dbadd176edade4'; // Quickupp's Cloudflare account (not secret)
const DEFAULT_BUCKET = 'quickuppcms-uploads';
export const R2_PART_SIZE = 10 * 1024 * 1024;

function cfg() {
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim() || DEFAULT_ACCOUNT_ID;
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucket = (process.env.R2_BUCKET || '').trim() || DEFAULT_BUCKET;
  const endpoint = (process.env.R2_ENDPOINT || '').trim() || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  return { accessKeyId, secretAccessKey, bucket, endpoint };
}

export function r2Enabled(): boolean {
  const c = cfg();
  return Boolean(c.accessKeyId && c.secretAccessKey && c.bucket && c.endpoint);
}

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    const c = cfg();
    client = new S3Client({
      region: 'auto',
      endpoint: c.endpoint,
      credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
      forcePathStyle: true,
    });
  }
  return client;
}
const bucket = () => cfg().bucket;
const keyOf = (storedName: string) => PREFIX + storedName;

export async function r2StartUpload(storedName: string, contentType: string): Promise<string> {
  const out = await s3().send(new CreateMultipartUploadCommand({
    Bucket: bucket(), Key: keyOf(storedName), ContentType: contentType,
  }));
  if (!out.UploadId) throw new Error('R2 did not start the upload');
  return out.UploadId;
}

export async function r2SignParts(storedName: string, uploadId: string, partNumbers: number[]): Promise<Record<number, string>> {
  const urls: Record<number, string> = {};
  await Promise.all(partNumbers.map(async (n) => {
    urls[n] = await getSignedUrl(
      s3(),
      new UploadPartCommand({ Bucket: bucket(), Key: keyOf(storedName), UploadId: uploadId, PartNumber: n }),
      { expiresIn: 60 * 60 * 6 }
    );
  }));
  return urls;
}

export async function r2CompleteUpload(
  storedName: string,
  uploadId: string,
  parts: { PartNumber: number; ETag: string }[]
): Promise<number> {
  await s3().send(new CompleteMultipartUploadCommand({
    Bucket: bucket(), Key: keyOf(storedName), UploadId: uploadId,
    MultipartUpload: { Parts: parts.slice().sort((a, b) => a.PartNumber - b.PartNumber) },
  }));
  const head = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: keyOf(storedName) }));
  return Number(head.ContentLength || 0);
}

/** Copies a file from this server into R2 (used for uploads that came through the server, and
 *  to move older files off the server). Returns the size stored. */
export async function r2PutFile(localPath: string, storedName: string, contentType: string): Promise<number> {
  const size = fs.statSync(localPath).size;
  await s3().send(new PutObjectCommand({
    Bucket: bucket(),
    Key: keyOf(storedName),
    Body: fs.createReadStream(localPath),
    ContentLength: size,
    ContentType: contentType,
  }));
  const head = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: keyOf(storedName) }));
  if (Number(head.ContentLength || 0) !== size) throw new Error('size check failed after copying to R2');
  return size;
}

export async function r2AbortUpload(storedName: string, uploadId: string): Promise<void> {
  await s3().send(new AbortMultipartUploadCommand({ Bucket: bucket(), Key: keyOf(storedName), UploadId: uploadId }));
}

/** Private link (1 hour) to view, or — with downloadName — to download the file. */
export async function r2FileUrl(storedName: string, opts: { contentType?: string; downloadName?: string }): Promise<string> {
  const safeName = (opts.downloadName || '').replace(/["\\\r\n]/g, '_');
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: keyOf(storedName),
      ResponseContentType: opts.contentType,
      ResponseContentDisposition: safeName
        ? `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(opts.downloadName || '')}`
        : undefined,
    }),
    { expiresIn: 60 * 60 }
  );
}

export async function r2Exists(storedName: string): Promise<boolean> {
  try {
    await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: keyOf(storedName) }));
    return true;
  } catch {
    return false;
  }
}

/** Returns the bytes freed (0 if the file wasn't there). */
export async function r2Delete(storedName: string): Promise<number> {
  try {
    const head = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: keyOf(storedName) }));
    await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: keyOf(storedName) }));
    return Number(head.ContentLength || 0);
  } catch {
    return 0;
  }
}

export async function r2Usage(): Promise<{ bytes: number; files: number }> {
  let bytes = 0;
  let files = 0;
  let token: string | undefined;
  do {
    const out = await s3().send(new ListObjectsV2Command({ Bucket: bucket(), Prefix: PREFIX, ContinuationToken: token }));
    for (const o of out.Contents || []) {
      bytes += Number(o.Size || 0);
      files += 1;
    }
    token = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (token);
  return { bytes, files };
}
