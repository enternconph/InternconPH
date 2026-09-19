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

dotenv.config();

// Run database migrations on start and prune stale sessions
runMigrations()
  .then(() => pruneStaleSessions())
  .catch(console.error);

const app = express();
app.set('trust proxy', 1);

const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Realtime WebSockets (Socket.IO)
initSocket(httpServer);

// Enable HTTP payload compression (Gzip / Deflate)
app.use(compression());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Serve static uploaded documents with 7-day browser caching
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '7d',
  immutable: true
}));

// Health Check: lightweight, no auth, no database dependency
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
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

// Serve frontend dist for production deployment with SPA routing fallback & asset caching
const DIST_DIR = path.resolve(__dirname, '../../dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(DIST_DIR)) {
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

