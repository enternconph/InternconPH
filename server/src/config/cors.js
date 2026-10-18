/**
 * Centralized CORS allowed origins resolution for Express & Socket.IO
 */
export function getAllowedOrigins() {
  const envOrigins = process.env.CLIENT_URL || process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL;
  if (envOrigins && String(envOrigins).trim()) {
    return String(envOrigins).split(',').map(s => s.trim()).filter(Boolean);
  }
  return ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];
}

export function corsOriginCallback(origin, callback) {
  // Allow requests with no origin (like mobile apps, curl, server-to-server)
  if (!origin) return callback(null, true);

  const allowed = getAllowedOrigins();
  if (allowed.includes('*') || allowed.includes(origin)) {
    return callback(null, true);
  }

  // Allow all Vercel deployment domains (production and preview branches)
  if (/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/i.test(origin)) {
    return callback(null, true);
  }

  // Allow Render domains
  if (/^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin)) {
    return callback(null, true);
  }

  if (process.env.NODE_ENV !== 'production') {
    return callback(null, true);
  }

  console.warn(`[CORS] Rejected origin: ${origin}. Configure ALLOWED_ORIGINS or FRONTEND_URL to permit it.`);
  return callback(new Error(`Not allowed by CORS: ${origin}`));
}
