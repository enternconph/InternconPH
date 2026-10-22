/**
 * High-Performance Sliding Window Rate Limiting Middleware for InternConPH
 * Provides zero-dependency, memory-safe rate limiting with RFC-compliant headers:
 * - RateLimit-Limit
 * - RateLimit-Remaining
 * - RateLimit-Reset
 * - Retry-After
 */

class SlidingWindowStore {
  constructor(windowMs, maxRequests) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.hits = new Map(); // key -> [timestamps]

    // Periodic cleanup of stale IPs every 2 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, timestamps] of this.hits.entries()) {
        const valid = timestamps.filter(t => now - t < this.windowMs);
        if (valid.length === 0) {
          this.hits.delete(key);
        } else {
          this.hits.set(key, valid);
        }
      }
    }, 2 * 60 * 1000);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  record(key) {
    const now = Date.now();
    let timestamps = this.hits.get(key) || [];
    timestamps = timestamps.filter(t => now - t < this.windowMs);
    timestamps.push(now);
    this.hits.set(key, timestamps);
    return {
      total: timestamps.length,
      remaining: Math.max(0, this.maxRequests - timestamps.length),
      resetMs: this.windowMs - (now - timestamps[0])
    };
  }

  reset(key) {
    this.hits.delete(key);
  }
}

/**
 * Factory for creating rate limiting middleware
 */
export function createRateLimiter({
  windowMs = 60 * 1000,
  max = 100,
  message = 'Too many requests. Please try again later.',
  keyGenerator = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) ||
      req.socket?.remoteAddress || req.ip || '127.0.0.1';
    return ip;
  },
  skip = () => false
}) {
  const store = new SlidingWindowStore(windowMs, max);

  return (req, res, next) => {
    if (skip(req)) return next();

    const key = keyGenerator(req);
    const result = store.record(key);

    const resetSec = Math.ceil(result.resetMs / 1000);
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', result.remaining);
    res.setHeader('RateLimit-Reset', resetSec);

    if (result.total > max) {
      res.setHeader('Retry-After', resetSec);
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message,
        retryAfter: resetSec,
        status: 429
      });
    }

    next();
  };
}

// 1. Strict Auth Limiter: Max 20 login/register attempts per 15 minutes per IP
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
});

// 2. Dynamic QR Scanner Limiter: Max 60 scan verifications per minute
export const qrScanRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Attendance verification rate limit reached. Please wait a moment before scanning again.'
});

// 3. Global API Limiter: Max 600 requests per minute per IP (bypasses health checks)
export const globalApiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 600,
  message: 'API request threshold exceeded. Please throttle your client requests.',
  skip: (req) => req.path === '/health' || req.path === '/api/health' || req.path.startsWith('/uploads')
});
