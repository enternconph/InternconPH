import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { runMigrations } from './config/migrate.js';
import { initSocket } from './config/socket.js';
import { pruneStaleSessions } from './utils/session.js';

import authRoutes from './routes/auth.routes.js';
import publicRoutes from './routes/public.routes.js';
import studentRoutes from './routes/student.routes.js';
import orgRoutes from './routes/organization.routes.js';
import instRoutes from './routes/institution.routes.js';
import adminRoutes from './routes/admin.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import userRoutes from './routes/user.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import { checkGoogleMeetConfigOnStartup } from './services/googleMeet.service.js';

// Run database migrations on start, prune stale sessions, and verify integrations
runMigrations()
  .then(() => pruneStaleSessions())
  .then(() => checkGoogleMeetConfigOnStartup())
  .catch(console.error);

const app = express();
app.set('trust proxy', 1);

const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Realtime WebSockets (Socket.IO)
initSocket(httpServer);

// Enable HTTP payload compression (Gzip / Deflate)
app.use(compression());


// Ensure canonical uploads directories exist
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
['orgs', 'institutions', 'portfolio', 'avatars', 'requirements'].forEach((sub) => {
  const p = path.join(UPLOADS_DIR, sub);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
});

import { corsOriginCallback } from './config/cors.js';

app.use(cors({
  origin: corsOriginCallback,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

import pool from './config/db.js';

import certificateRoutes from './routes/certificate.routes.js';

// Dynamic Certificate Route Handler for direct uploads/portfolio/certificate links
app.get(['/uploads/portfolio/certificate*', '/uploads/certificate*', '/uploads/*CERT-OJT*'], (req, res) => {
  const fullPath = decodeURIComponent(req.originalUrl || req.path);
  const match = fullPath.match(/CERT-OJT-[A-Za-z0-9-]+/i);
  if (match && match[0]) {
    return res.redirect(`/api/certificates/render/${match[0]}`);
  }
  return res.status(404).send('Certificate serial not recognized.');
});

// Serve static uploaded documents with 7-day browser caching
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '7d',
  immutable: true
}));

// Fallback for uploaded documents when local disk has been cleared (e.g. Render restart/redeploy)
app.get(['/uploads/:subfolder/:filename', '/uploads/:filename'], async (req, res) => {
  const subfolder = req.params.subfolder || '';
  const filename = req.params.filename;

  if (!filename) {
    return res.status(404).send('File not found');
  }

  // Intercept any certificate serial in filename
  if (filename.includes('CERT-OJT-') || filename.startsWith('certificate')) {
    const match = filename.match(/CERT-OJT-[A-Za-z0-9-]+/i);
    if (match && match[0]) {
      return res.redirect(`/api/certificates/render/${match[0]}`);
    }
  }

  const filePathRel = subfolder ? `/uploads/${subfolder}/${filename}` : `/uploads/${filename}`;

  try {
    const [rows] = await pool.query(
      `SELECT file_name, mime_type, file_data 
       FROM stored_uploads 
       WHERE file_path = ? OR file_path LIKE ? OR file_name = ?
       ORDER BY upload_id DESC LIMIT 1`,
      [filePathRel, `%/${filename}`, filename]
    );

    if (rows && rows.length > 0) {
      const record = rows[0];
      // Re-hydrate local disk cache so subsequent requests are served ultra-fast by express.static
      try {
        const localDir = subfolder ? path.join(UPLOADS_DIR, subfolder) : UPLOADS_DIR;
        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true });
        }
        const localPath = path.join(localDir, filename);
        fs.writeFileSync(localPath, record.file_data);
      } catch (cacheErr) {
        console.warn('[Upload Fallback] Could not write to disk cache:', cacheErr.message);
      }

      // Determine MIME type
      let contentType = record.mime_type;
      if (!contentType) {
        const ext = path.extname(filename).toLowerCase();
        const mimeMap = {
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '.doc': 'application/msword',
          '.pdf': 'application/pdf',
          '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '.xls': 'application/vnd.ms-excel',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.webp': 'image/webp',
          '.zip': 'application/zip'
        };
        contentType = mimeMap[ext] || 'application/octet-stream';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      const isDownload = req.query.download === 'true' || req.query.download === '1' || !['.pdf', '.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(filename).toLowerCase());
      const dispositionType = isDownload ? 'attachment' : 'inline';
      res.setHeader('Content-Disposition', `${dispositionType}; filename="${encodeURIComponent(record.file_name || filename)}"`);
      return res.send(record.file_data);
    }
  } catch (err) {
    console.error('[Upload Fallback Handler Error]', err);
  }

  // If not found in database, check if it was associated with an OJT requirement
  let requirementInfo = null;
  try {
    const [reqRows] = await pool.query(
      `SELECT requirement_name, description FROM ojt_requirements 
       WHERE document_template_url LIKE ? OR document_template_url LIKE ? LIMIT 1`,
      [`%${filename}%`, `%${filePathRel}%`]
    );
    if (reqRows && reqRows.length > 0) {
      requirementInfo = reqRows[0];
    }
  } catch (qErr) {
    // Ignore query error
  }

  // Graceful human-friendly response if file is missing from both disk and database
  return res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Document Not Found - InternConPH</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0f172a;
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 1.5rem;
          }
          .card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
            max-width: 540px;
            width: 100%;
            padding: 2.5rem;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          }
          .icon {
            width: 56px;
            height: 56px;
            margin: 0 auto 1.25rem;
            background: rgba(249, 115, 22, 0.15);
            color: #f97316;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
          }
          h1 {
            font-size: 1.35rem;
            font-weight: 700;
            color: #f8fafc;
            margin-bottom: 0.75rem;
          }
          p {
            font-size: 0.925rem;
            color: #94a3b8;
            line-height: 1.6;
            margin-bottom: 1.25rem;
          }
          .note {
            background: #0f172a;
            border-left: 4px solid #f97316;
            padding: 0.85rem 1.15rem;
            border-radius: 8px;
            font-size: 0.875rem;
            color: #cbd5e1;
            text-align: left;
            margin-bottom: 1.5rem;
            line-height: 1.5;
          }
          .btn {
            display: inline-block;
            background: #f97316;
            color: #fff;
            padding: 0.65rem 1.5rem;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9rem;
            transition: background 0.2s;
          }
          .btn:hover {
            background: #ea580c;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">&#9888;</div>
          <h1>Template Document Currently Unavailable</h1>
          <p>${requirementInfo ? `The template document for <strong>"${requirementInfo.requirement_name}"</strong> was created on an ephemeral container before permanent database storage synchronization.` : 'The requested document was created before permanent database storage synchronization or has expired.'}</p>
          <div class="note">
            <strong>Action Needed:</strong> Please request your OJT Coordinator or Institution Staff to re-upload the official template file in their <em>Clearance Requirements</em> dashboard. Any future uploads are permanently saved and will never be lost!
          </div>
          <a href="javascript:history.back()" class="btn">&larr; Return to Dashboard</a>
        </div>
      </body>
    </html>
  `);
});

// Health Check: verifies service and database connectivity
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, status: 'error', database: 'disconnected', error: err.message });
  }
});

// Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes); // Supports /api/login, /api/session, /api/logout
app.use('/api/user', userRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/inst', instRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/certificates', certificateRoutes);

// Serve frontend dist with SPA routing fallback & asset caching
const DIST_DIR = path.resolve(__dirname, '../../dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else if (filePath.includes(path.sep + 'assets' + path.sep) || filePath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message || err);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    success: false,
    message: isProd ? 'Internal Server Error' : (err.message || 'Internal Server Error')
  });
});

// Process-level unhandled rejection / uncaught exception handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection at Promise]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] InternConPH API + Socket.IO Realtime running on port ${PORT}`);
});

