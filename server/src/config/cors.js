/**
 * Centralized CORS allowed origins resolution for Express & Socket.IO
 */
export function getAllowedOrigins() {
  const envOrigins = process.env.CLIENT_URL || process.env.ALLOWED_ORIGINS;
  if (envOrigins && String(envOrigins).trim()) {
    return String(envOrigins).split(',').map(s => s.trim()).filter(Boolean);
  }
  return ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];
}

export function corsOriginCallback(origin, callback) {
  if (!origin) return callback(null, true);
  const allowed = getAllowedOrigins();
  if (allowed.includes('*') || allowed.includes(origin)) {
    return callback(null, true);
  }
  if (process.env.NODE_ENV !== 'production') {
    return callback(null, true);
  }
  return callback(new Error('Not allowed by CORS'));
}
