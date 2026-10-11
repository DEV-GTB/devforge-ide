import express from 'express';
import cors from 'cors';

const router = express.Router();

/**
 * API Router Infrastructure
 * Purpose: Centralized API routing with versioning, rate limiting, and middleware
 * Features:
 * - API versioning (v1, v2)
 * - Request logging
 * - Response formatting
 * - Error handling
 * - CORS configuration
 */

// Request logging middleware
router.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Health check for API layer
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API information
router.get('/info', (req, res) => {
  res.json({
    name: 'DevForge API',
    version: '1.0.0',
    description: 'DevForge Studio API Infrastructure',
    endpoints: {
      v1: '/api/v1',
      v2: '/api/v2',
    },
    features: [
      'Versioning',
      'Rate Limiting',
      'Request Logging',
      'Error Handling',
      'CORS Support',
    ],
  });
});

// NOTE: No catch-all 404 lives here. This router is mounted at `/api` before
// several app-level routes (chat, image, preview-bundle, ...) that are defined
// later in the Express chain. A terminal handler here would shadow them, so
// unknown `/api/*` routes are given a JSON 404 at the app level instead (see
// server.ts, after all custom routes are registered).

export default router;
