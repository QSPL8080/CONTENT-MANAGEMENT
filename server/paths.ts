import fs from 'fs';
import path from 'path';

/**
 * Where the app keeps files it creates while running.
 *
 * By default these live inside the project folder (./data and ./uploads). On hosts that
 * replace the project folder on every deployment (e.g. Hostinger's Node.js hosting syncs
 * each new version into public_html), point them OUTSIDE that folder so a deployment never
 * deletes them and never trips over them:
 *
 *   DATA_DIR=/home/<user>/contentops-data        # vault key + accounts backup
 *   UPLOADS_DIR=/home/<user>/contentops-uploads  # uploaded designs and videos
 */
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
export const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'));

// When uploads live outside the project, copy the demo sample videos that ship in ./uploads
// so "attach sample video" keeps working. Real uploads are never touched.
const BUNDLED_UPLOADS = path.resolve(process.cwd(), 'uploads');
if (UPLOADS_DIR !== BUNDLED_UPLOADS) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    for (const f of fs.existsSync(BUNDLED_UPLOADS) ? fs.readdirSync(BUNDLED_UPLOADS) : []) {
      if (!/^sample-reel-\d+\.mp4$/.test(f)) continue;
      const target = path.join(UPLOADS_DIR, f);
      if (!fs.existsSync(target)) fs.copyFileSync(path.join(BUNDLED_UPLOADS, f), target);
    }
  } catch (err: any) {
    console.warn(`⚠️  Could not prepare UPLOADS_DIR (${UPLOADS_DIR}): ${err.message}`);
  }
}
