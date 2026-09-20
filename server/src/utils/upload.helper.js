import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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

  // Local disk fallback when Multer diskStorage was used
  if (file.filename) {
    return `/uploads/${subfolder}/${file.filename}`;
  }

  // Local disk fallback when buffer is present (memoryStorage or Cloudinary fallback)
  if (file.buffer) {
    try {
      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const safeFilename = `${subfolder}-${uniqueSuffix}${ext}`;
      const targetFilePath = path.join(destinationDir, safeFilename);
      fs.writeFileSync(targetFilePath, file.buffer);
      return `/uploads/${subfolder}/${safeFilename}`;
    } catch (diskErr) {
      console.error('[Upload Helper] Local disk write error:', diskErr);
      return null;
    }
  }

  return null;
}
