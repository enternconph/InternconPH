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
  if (!fs.existsSync(destinationDir)) {
    fs.mkdirSync(destinationDir, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, destinationDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${subfolder}-${uniqueSuffix}${ext}`);
    }
  });
}

/**
 * Saves uploaded file either to Cloudinary (if configured) or returns the local relative URL.
 * @param {Object} file - The file object from req.file or req.files
 * @param {string} subfolder - Target logical folder ('avatars', 'portfolio', 'requirements', 'orgs', 'institutions')
 * @returns {Promise<string>} The resolved file URL (HTTPS for Cloudinary, /uploads/... for local)
 */
export async function saveUploadedFile(file, subfolder) {
  if (!file) return null;

  // Cloudinary upload if memory buffer is present
  if (isCloudinaryEnabled() && file.buffer) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `internconph/${subfolder}`,
          resource_type: 'auto'
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
  }

  // Local disk fallback
  if (file.filename) {
    return `/uploads/${subfolder}/${file.filename}`;
  }

  return null;
}
