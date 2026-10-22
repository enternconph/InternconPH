/**
 * Enterprise HTTP Security Headers Middleware for InternConPH
 * Implements defensive headers in compliance with OWASP guidelines:
 * - Anti-Clickjacking (X-Frame-Options)
 * - MIME-sniffing protection (X-Content-Type-Options)
 * - Cross-Site Scripting filtering (X-XSS-Protection)
 * - Strict Referrer Policy
 * - Production Strict Transport Security (HSTS)
 * - Controlled Browser Permissions Policy
 */

export function securityHeaders() {
  return (req, res, next) => {
    // 1. Prevent MIME-type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // 2. Clickjacking protection: Permit same-origin embedding for official certificate views
    if (req.path.includes('/certificates/render')) {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    } else {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }

    // 3. Browser XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // 4. Referrer policy to safeguard sensitive URLs
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 5. Restrict camera usage strictly to same origin for QR attendance scanner
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');

    // 6. Enforce HSTS in production or when connection is HTTPS
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    if (process.env.NODE_ENV === 'production' || isHttps) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    next();
  };
}
