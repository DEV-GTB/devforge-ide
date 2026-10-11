import express from 'express';
import { DatabaseManager } from './DatabaseManager';

const router = express.Router();
const dbManager = new DatabaseManager();

/**
 * Database API Routes
 * Purpose: REST API for database operations
 * Endpoints:
 * - GET /api/database/tables - List all tables
 * - GET /api/database/tables/:name/info - Get table structure
 * - POST /api/database/query - Execute query
 * - POST /api/database/backup - Create backup
 * - POST /api/database/restore - Restore from backup
 * - POST /api/database/migrate - Run migrations
 */

// Connect to database
router.post('/connect', (req, res) => {
  try {
    dbManager.connect();
    res.json({ success: true, path: dbManager.getPath() });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Disconnect from database
router.post('/disconnect', (req, res) => {
  try {
    dbManager.disconnect();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// List tables
router.get('/tables', async (req, res) => {
  try {
    dbManager.connect();
    const tables = await dbManager.getTables();
    res.json({ tables });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get table info
router.get('/tables/:name/info', async (req, res) => {
  try {
    dbManager.connect();
    const info = await dbManager.getTableInfo(req.params.name);
    res.json({ columns: info });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Execute query
router.post('/query', async (req, res) => {
  try {
    const { sql, params } = req.body;
    if (!sql) {
      return res.status(400).json({ error: 'SQL query is required' });
    }

    dbManager.connect();
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

    if (isSelect) {
      const rows = await dbManager.query(sql, params || []);
      res.json({ rows });
    } else {
      const result = await dbManager.execute(sql, params || []);
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Create backup
router.post('/backup', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      return res.status(400).json({ error: 'Backup path is required' });
    }

    dbManager.connect();
    await dbManager.backup(path);
    res.json({ success: true, path });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Restore from backup
router.post('/restore', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      return res.status(400).json({ error: 'Backup path is required' });
    }

    await dbManager.restore(path);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Run migrations
router.post('/migrate', async (req, res) => {
  try {
    const { path } = req.body;
    dbManager.connect();
    await dbManager.migrate(path || './migrations');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
