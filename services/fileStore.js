import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists outside public/
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Sanitizes original filename to prevent path traversal and length attacks.
 * Strips directory separators, removes control characters, truncates to 100 chars.
 */
export function sanitizeDisplayName(originalName) {
  if (!originalName || typeof originalName !== 'string') return 'report';
  // Strip paths
  let clean = path.basename(originalName);
  // Remove dangerous characters / non-printable
  clean = clean.replace(/[^a-zA-Z0-9._\- ]/g, '_').trim();
  if (clean.length > 100) {
    const ext = path.extname(clean);
    const base = path.basename(clean, ext);
    clean = base.substring(0, 100 - ext.length) + ext;
  }
  return clean || 'report';
}

/**
 * Storage Abstraction for medical reports.
 * Allows switching between local filesystem and cloud providers (S3/GCS) in the future.
 */
export const fileStore = {
  /**
   * Saves buffer with random UUID filename with no extension.
   * @param {Buffer} buffer
   * @returns {Promise<string>} stored_name (UUID)
   */
  async saveFile(buffer) {
    const storedName = crypto.randomUUID();
    const filePath = path.join(UPLOADS_DIR, storedName);
    await fs.promises.writeFile(filePath, buffer);
    return storedName;
  },

  /**
   * Returns a readable stream for a stored file.
   * @param {string} storedName
   * @returns {fs.ReadStream | null}
   */
  getReadStream(storedName) {
    if (!storedName || typeof storedName !== 'string') return null;
    // Prevent directory traversal: keep only alphanumeric and hyphens (UUID format)
    const safeName = path.basename(storedName).replace(/[^a-zA-Z0-9-]/g, '');
    const filePath = path.join(UPLOADS_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.createReadStream(filePath);
  },

  /**
   * Checks if file exists on disk.
   * @param {string} storedName
   * @returns {boolean}
   */
  fileExists(storedName) {
    if (!storedName) return false;
    const safeName = path.basename(storedName).replace(/[^a-zA-Z0-9-]/g, '');
    const filePath = path.join(UPLOADS_DIR, safeName);
    return fs.existsSync(filePath);
  },

  /**
   * Permanently deletes file from disk.
   * @param {string} storedName
   * @returns {Promise<boolean>}
   */
  async deleteFile(storedName) {
    if (!storedName) return false;
    const safeName = path.basename(storedName).replace(/[^a-zA-Z0-9-]/g, '');
    const filePath = path.join(UPLOADS_DIR, safeName);
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
    } catch (err) {
      console.error(`[FileStore] Error deleting file ${safeName}:`, err);
    }
    return false;
  },

  /**
   * Nightly cron disk purge for soft-deleted reports older than retentionDays (7 days).
   * @param {Array} reports
   * @param {number} retentionDays
   */
  async purgeDeletedFiles(reports, retentionDays = 7) {
    if (!Array.isArray(reports)) return 0;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let purgedCount = 0;

    for (const report of reports) {
      if (report.deleted_at && !report.purged_from_disk) {
        const deletedTime = new Date(report.deleted_at).getTime();
        if (deletedTime < cutoff) {
          const ok = await this.deleteFile(report.stored_name);
          if (ok) {
            report.purged_from_disk = true;
            purgedCount++;
          }
        }
      }
    }
    return purgedCount;
  }
};

export default fileStore;
