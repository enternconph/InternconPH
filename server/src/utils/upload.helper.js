import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
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
 * Image processing configuration rules based on target subfolder context
 */
const IMAGE_CONFIG_BY_SUBFOLDER = {
  avatars: {
    maxWidth: 400,
    maxHeight: 400,
    fit: 'cover',
    quality: 82,
    format: 'webp'
  },
  orgs: {
    maxWidth: 600,
    maxHeight: 600,
    fit: 'inside',
    quality: 85,
    format: 'webp'
  },
  institutions: {
    maxWidth: 600,
    maxHeight: 600,
    fit: 'inside',
    quality: 85,
    format: 'webp'
  },
  job_flyers: {
    maxWidth: 1400,
    maxHeight: 1400,
    fit: 'inside',
    quality: 84,
    format: 'webp'
  },
  portfolio: {
    maxWidth: 1800,
    maxHeight: 1800,
    fit: 'inside',
    quality: 85,
    format: 'webp'
  },
  requirements: {
    maxWidth: 1800,
    maxHeight: 1800,
    fit: 'inside',
    quality: 85,
    format: 'webp'
  }
};

/**
 * Optimizes an image buffer using Sharp.
 * Reduces dimensions and compresses to WebP to drastically reduce bandwidth and prevent browser lag.
 * Falls back to original buffer if sharp fails or file is not a supported image.
 */
export async function optimizeImageBuffer(buffer, mimetype, subfolder = 'portfolio') {
  if (!buffer || !Buffer.isBuffer(buffer)) return { buffer, mimetype, ext: null };
  
  const isImageMime = mimetype && mimetype.startsWith('image/');
  const isSvg = mimetype === 'image/svg+xml';
  const isGif = mimetype === 'image/gif';

  // SVG, animated GIF, or non-images should remain untouched
  if (!isImageMime || isSvg || isGif) {
    return { buffer, mimetype, ext: null };
  }

  const config = IMAGE_CONFIG_BY_SUBFOLDER[subfolder] || {
    maxWidth: 1600,
    maxHeight: 1600,
    fit: 'inside',
    quality: 85,
    format: 'webp'
  };

  try {
    const pipeline = sharp(buffer, { failOn: 'none' })
      .rotate() // Auto-orient based on EXIF
      .resize({
        width: config.maxWidth,
        height: config.maxHeight,
        fit: config.fit,
        withoutEnlargement: true
      });

    if (config.format === 'webp') {
      pipeline.webp({ quality: config.quality, effort: 4 });
    } else {
      pipeline.jpeg({ quality: config.quality, mozjpeg: true });
    }

    const optimizedBuffer = await pipeline.toBuffer();
    return {
      buffer: optimizedBuffer,
      mimetype: 'image/webp',
      ext: '.webp'
    };
  } catch (err) {
    console.warn(`[Upload Optimizer] Sharp optimization bypassed for ${subfolder}:`, err.message);
    return { buffer, mimetype, ext: null };
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
 * Automatically resizes and compresses image assets before writing to disk and stored_uploads.
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
  let originalExt = path.extname(file.originalname || '').toLowerCase();
  let bufferToProcess = file.buffer || null;

  if (!bufferToProcess && file.path && fs.existsSync(file.path)) {
    try {
      bufferToProcess = fs.readFileSync(file.path);
    } catch (readErr) {
      console.warn('[Upload Helper] Could not read disk file:', readErr.message);
    }
  }

  let finalMime = file.mimetype || 'application/octet-stream';
  let finalExt = originalExt;
  let finalBuffer = bufferToProcess;

  // Process and optimize images if buffer is present
  if (bufferToProcess && finalMime.startsWith('image/')) {
    const optResult = await optimizeImageBuffer(bufferToProcess, finalMime, subfolder);
    finalBuffer = optResult.buffer;
    finalMime = optResult.mimetype;
    if (optResult.ext) {
      finalExt = optResult.ext;
    }
  }

  const cleanBase = path.basename(file.originalname || 'document', originalExt)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 50);

  // Cloudinary upload if enabled and buffer is available
  if (isCloudinaryEnabled() && finalBuffer) {
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
        uploadStream.end(finalBuffer);
      });
      return secureUrl;
    } catch (cloudErr) {
      console.warn('[Upload Helper] Cloudinary upload failed, falling back to local disk storage:', cloudErr.message || cloudErr);
    }
  }

  let finalWebPath = null;
  const fileName = (cleanBase ? cleanBase + finalExt : file.originalname || 'document');
  const fileSize = finalBuffer ? finalBuffer.length : (file.size || 0);

  // Write optimized buffer to disk storage
  try {
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeFilename = `${subfolder}-${uniqueSuffix}${finalExt}`;
    const targetFilePath = path.join(destinationDir, safeFilename);
    
    if (finalBuffer) {
      fs.writeFileSync(targetFilePath, finalBuffer);
      // If multer created an unoptimized temporary disk file that differs, clean it up
      if (file.path && file.path !== targetFilePath && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (uErr) {}
      }
    }
    
    finalWebPath = `/uploads/${subfolder}/${safeFilename}`;
  } catch (diskErr) {
    console.error('[Upload Helper] Local disk write error:', diskErr);
    return null;
  }

  // Persist into database so ephemeral containers (Render/Fly/Heroku) never lose uploaded documents
  if (finalWebPath && finalBuffer) {
    try {
      await pool.query(
        `INSERT INTO stored_uploads (file_path, file_name, mime_type, file_size, file_data)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           file_name = VALUES(file_name),
           mime_type = VALUES(mime_type),
           file_size = VALUES(file_size),
           file_data = VALUES(file_data)`,
        [finalWebPath, fileName, finalMime, fileSize, finalBuffer]
      );
    } catch (dbErr) {
      console.warn('[Upload Helper] Could not persist upload to stored_uploads table:', dbErr.message);
    }
  }

  return finalWebPath;
}

export function formatFilePath(fp) {
  if (!fp) return '';
  if (fp.startsWith('certificate://') || fp.startsWith('certificate:')) {
    const code = fp.replace(/^certificate:\/\//, '').replace(/^certificate:/, '');
    return `/api/certificates/render/${code}`;
  }
  if (fp.startsWith('http://') || fp.startsWith('https://') || fp.startsWith('blob:') || fp.startsWith('data:')) return fp;
  if (fp.startsWith('/api/')) return fp;
  if (fp.startsWith('/uploads/')) return fp;
  if (fp.startsWith('uploads/')) return '/' + fp;
  return `/uploads/portfolio/${fp.replace(/^\/+/, '')}`;
}

export const processUploadedFile = saveUploadedFile;
