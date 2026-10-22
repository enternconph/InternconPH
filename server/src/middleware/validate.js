/**
 * Declarative Schema Validation Engine for InternConPH
 * Provides type checking, bounds enforcement, and input sanitization without external bloat.
 */

export function validate(schema) {
  return (req, res, next) => {
    const errors = [];

    // 1. Validate req.body
    if (schema.body) {
      const bodyErrors = validateObject(req.body || {}, schema.body, 'body');
      errors.push(...bodyErrors);
    }

    // 2. Validate req.params
    if (schema.params) {
      const paramErrors = validateObject(req.params || {}, schema.params, 'params');
      errors.push(...paramErrors);
    }

    // 3. Validate req.query
    if (schema.query) {
      const queryErrors = validateObject(req.query || {}, schema.query, 'query');
      errors.push(...queryErrors);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0].message || 'Validation failed.',
        errors,
        status: 400
      });
    }

    next();
  };
}

function validateObject(data, rules, context) {
  const errors = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    // Check required
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({ field, message: `${field} is required.`, context });
      continue;
    }

    if (value === undefined || value === null || value === '') {
      continue; // Optional field empty
    }

    // Type check
    if (rule.type) {
      if (rule.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push({ field, message: `${field} must be a valid number.`, context });
          continue;
        }
        if (rule.min !== undefined && num < rule.min) {
          errors.push({ field, message: `${field} must be at least ${rule.min}.`, context });
        }
        if (rule.max !== undefined && num > rule.max) {
          errors.push({ field, message: `${field} cannot exceed ${rule.max}.`, context });
        }
      } else if (rule.type === 'string') {
        if (typeof value !== 'string') {
          errors.push({ field, message: `${field} must be a string.`, context });
          continue;
        }
        if (rule.minLength && value.length < rule.minLength) {
          errors.push({ field, message: `${field} must be at least ${rule.minLength} characters.`, context });
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push({ field, message: `${field} cannot exceed ${rule.maxLength} characters.`, context });
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push({ field, message: rule.patternMessage || `${field} format is invalid.`, context });
        }
      } else if (rule.type === 'boolean') {
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== 1 && value !== 0) {
          errors.push({ field, message: `${field} must be a boolean.`, context });
        }
      } else if (rule.type === 'array') {
        if (!Array.isArray(value)) {
          errors.push({ field, message: `${field} must be an array.`, context });
        }
      }
    }

    // Enum check
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({ field, message: `${field} must be one of: [${rule.enum.join(', ')}].`, context });
    }
  }

  return errors;
}

// =========================================================================
// STANDARD VALIDATION SCHEMAS
// =========================================================================

export const Schemas = {
  // Authentication
  login: {
    body: {
      email: { type: 'string', required: true, pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, patternMessage: 'Please provide a valid email address.' },
      password: { type: 'string', required: true, minLength: 1 }
    }
  },

  // Attendance & Hours Verification
  verifyAttendance: {
    params: {
      id: { type: 'string', required: true, pattern: /^\d+$/, patternMessage: 'Attendance ID must be numeric.' }
    },
    body: {
      hours_rendered: { type: 'number', required: false, min: 0, max: 24 },
      action: { type: 'string', required: false, enum: ['verify', 'reject'] },
      status: { type: 'string', required: false, enum: ['verified', 'rejected', 'pending'] }
    }
  },

  // Manual DTR Shift Logging
  dtrLog: {
    body: {
      log_date: { type: 'string', required: true, pattern: /^\d{4}-\d{2}-\d{2}$/, patternMessage: 'log_date must be in YYYY-MM-DD format.' },
      hours_rendered: { type: 'number', required: true, min: 0.1, max: 24 }
    }
  },

  // Dynamic QR Code Verification
  qrVerification: {
    body: {
      qr_payload: { type: 'string', required: true, minLength: 10 }
    }
  },

  // Grievances & Accidents
  complaint: {
    body: {
      subject: { type: 'string', required: true, minLength: 3, maxLength: 255 },
      description: { type: 'string', required: true, minLength: 10 }
    }
  }
};
