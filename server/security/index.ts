import express from 'express';
import { SecurityManager, SecurityConfig } from './SecurityManager';

const router = express.Router();

const config: SecurityConfig = {
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  sessionSecret: process.env.SESSION_SECRET || 'default-session-secret',
  rateLimitWindow: 900000, // 15 minutes
  rateLimitMax: 100,
  enableCSRF: true,
  enableXSS: true,
};

const securityManager = new SecurityManager(config);

/**
 * Security API Routes
 * Purpose: REST API for security operations
 * Endpoints:
 * - POST /api/security/jwt/generate - Generate JWT token
 * - POST /api/security/jwt/validate - Validate JWT token
 * - POST /api/security/session/generate - Generate session token
 * - POST /api/security/session/validate - Validate session token
 * - POST /api/security/rate-limit/check - Check rate limit
 * - POST /api/security/csrf/generate - Generate CSRF token
 * - POST /api/security/sanitize - Sanitize input
 * - POST /api/security/hash - Hash password
 * - POST /api/security/encrypt - Encrypt data
 * - POST /api/security/decrypt - Decrypt data
 * - GET /api/security/audit - Get audit log
 * - DELETE /api/security/audit - Clear audit log
 */

// Generate JWT
router.post('/jwt/generate', (req, res) => {
  try {
    const { payload, expiresIn } = req.body;
    if (!payload) {
      return res.status(400).json({ error: 'Payload is required' });
    }

    const token = securityManager.generateJWT(payload, expiresIn);
    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Validate JWT
router.post('/jwt/validate', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const decoded = securityManager.validateJWT(token);
    if (!decoded) {
      return res.status(401).json({ valid: false });
    }

    res.json({ valid: true, decoded });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Generate session token
router.post('/session/generate', (req, res) => {
  try {
    const token = securityManager.generateSessionToken();
    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Validate session token
router.post('/session/validate', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const valid = securityManager.validateSessionToken(token);
    res.json({ valid });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Check rate limit
router.post('/rate-limit/check', (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Identifier is required' });
    }

    const allowed = securityManager.checkRateLimit(identifier);
    res.json({ allowed });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Generate CSRF token
router.post('/csrf/generate', (req, res) => {
  try {
    const token = securityManager.generateCSRFToken();
    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Sanitize input
router.post('/sanitize', (req, res) => {
  try {
    const { input } = req.body;
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }

    const sanitized = securityManager.sanitizeInput(input);
    res.json({ success: true, sanitized });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Hash password
router.post('/hash', (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const hash = securityManager.hashPassword(password);
    res.json({ success: true, hash });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Encrypt data
router.post('/encrypt', (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    const encrypted = securityManager.encrypt(data);
    res.json({ success: true, encrypted });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Decrypt data
router.post('/decrypt', (req, res) => {
  try {
    const { encryptedData } = req.body;
    if (!encryptedData) {
      return res.status(400).json({ error: 'Encrypted data is required' });
    }

    const decrypted = securityManager.decrypt(encryptedData);
    res.json({ success: true, decrypted });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get audit log
router.get('/audit', (req, res) => {
  try {
    const { limit } = req.query;
    const auditLog = securityManager.getAuditLog(parseInt(limit as string) || 100);
    res.json({ auditLog });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Clear audit log
router.delete('/audit', (req, res) => {
  try {
    securityManager.clearAuditLog();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
