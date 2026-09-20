import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');

export const isCloudinaryEnabled = () => {
  return Boolean(
    process.env.CLOUDINARY_URL || 
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  );
};

// Configure Cloudinary if credentials are provided in the environment
if (isCloudinaryEnabled()) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config();
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
  }
}

/**
 * Returns appropriate Multer storage engine based on whether Cloudinary is configured
 */
export function getUploadStorage(subfolder) {
  if (isCloudinaryEnabled()) {
    return multer.memoryStorage();
  }

  const destinationDir = path.join(UPLOADS_ROOT, subfolder);
  try {
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }
  } catch (dirErr) {
    console.warn(`[Upload Storage] Could not pre-create directory ${destinationDir}:`, dirErr.message);
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        if (!fs.existsSync(destinationDir)) {
          fs.mkdirSync(destinationDir, { recursive: true });
        }
        cb(null, destinationDir);
      } catch (err) {
        cb(err, destinationDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname || '');
      cb(null, `${subfolder}-${uniqueSuffix}${ext}`);
    }
  });
}

/**
 * Saves uploaded file either to Cloudinary (if configured) or returns the local relative URL.
 * Falls back safely to local disk storage if Cloudinary upload encounters any issue or buffer is used.
 * Persists all uploaded assets to the database (stored_uploads) so ephemeral hosts (like Render)
 * retain templates, student submissions, resumes, and legal credentials across restarts and redeploys.
 * @param {Object} file - The file object from req.file or req.files
 * @param {string} subfolder - Target logical folder ('avatars', 'portfolio', 'requirements', 'orgs', 'institutions')
 * @returns {Promise<string>} The resolved file URL (HTTPS for Cloudinary, /uploads/... for local)
 */
export async function saveUploadedFile(file, subfolder = 'portfolio') {
  if (!file) return null;

  const destinationDir = path.join(UPLOADS_ROOT, subfolder);
  const ext = path.extname(file.originalname || '').toLowerCase();
  const cleanBase = path.basename(file.originalname || 'document', ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 50);

  // Cloudinary upload if enabled and memory buffer is present
  if (isCloudinaryEnabled() && file.buffer) {
    try {
      const secureUrl = await new Promise((resolve, reject) => {
        const uniquePublicId = `${cleanBase}-${Date.now()}`;
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `internconph/${subfolder}`,
            resource_type: 'auto',
            public_id: uniquePublicId,
            use_filename: true,
            unique_filename: true
          },
          (error, result) => {
            if (error) {
              console.error('[Cloudinary Upload Error]', error);
              return reject(error);
            }
            resolve(result.secure_url);
          }
        );
        uploadStream.end(file.buffer);
      });
      return secureUrl;
    } catch (cloudErr) {
      console.warn('[Upload Helper] Cloudinary upload failed, falling back to local disk storage:', cloudErr.message || cloudErr);
      // Fall through to save buffer locally
    }
  }

  let finalWebPath = null;
  let bufferToPersist = file.buffer || null;
  const fileName = file.originalname || file.filename || 'document';
  const mimeType = file.mimetype || null;
  const fileSize = file.size || (bufferToPersist ? bufferToPersist.length : 0);

  // Local disk fallback when Multer diskStorage was used
  if (file.filename) {
    finalWebPath = `/uploads/${subfolder}/${file.filename}`;
    if (!bufferToPersist) {
      const fullDiskPath = file.path || path.join(destinationDir, file.filename);
      if (fs.existsSync(fullDiskPath)) {
        try {
          bufferToPersist = fs.readFileSync(fullDiskPath);
        } catch (readErr) {
          console.warn('[Upload Helper] Could not read disk file for DB persistence:', readErr.message);
        }
      }
    }
  } else if (file.buffer) {
    // Local disk fallback when buffer is present (memoryStorage or Cloudinary fallback)
    try {
      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const safeFilename = `${subfolder}-${uniqueSuffix}${ext}`;
      const targetFilePath = path.join(destinationDir, safeFilename);
      fs.writeFileSync(targetFilePath, file.buffer);
      finalWebPath = `/uploads/${subfolder}/${safeFilename}`;
      bufferToPersist = file.buffer;
    } catch (diskErr) {
      console.error('[Upload Helper] Local disk write error:', diskErr);
      return null;
    }
  }

  // Persist into database so ephemeral containers (Render/Fly/Heroku) never lose uploaded documents
  if (finalWebPath && bufferToPersist) {
    try {
      await pool.query(
        `INSERT INTO stored_uploads (file_path, file_name, mime_type, file_size, file_data)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           file_name = VALUES(file_name),
           mime_type = VALUES(mime_type),
           file_size = VALUES(file_size),
           file_data = VALUES(file_data)`,
        [finalWebPath, fileName, mimeType, fileSize || bufferToPersist.length, bufferToPersist]
      );
    } catch (dbErr) {
      console.warn('[Upload Helper] Could not persist upload to stored_uploads table:', dbErr.message);
    }
  }

  return finalWebPath;
}
