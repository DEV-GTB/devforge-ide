import express from 'express';
import { CodeIndexer } from './CodeIndexer';
import * as path from 'path';

const router = express.Router();
const codeIndexer = new CodeIndexer();

/**
 * Indexing API Routes
 * Purpose: REST API for code indexing and search
 * Endpoints:
 * - POST /api/indexing/index - Index directory
 * - POST /api/indexing/file - Index single file
 * - GET /api/indexing/file/:path - Get file index
 * - GET /api/indexing/search - Search symbols
 * - GET /api/indexing/files - Get all indexed files
 * - DELETE /api/indexing - Clear index
 */

// Index directory
router.post('/index', async (req, res) => {
  try {
    const { path: dirPath, ignore } = req.body;
    if (!dirPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    await codeIndexer.indexDirectory(dirPath, ignore || ['node_modules', '.git', 'dist', 'build']);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Index single file
router.post('/file', async (req, res) => {
  try {
    const { path: filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const indexed = await codeIndexer.indexFile(filePath);
    res.json({ success: true, indexed });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get file index
router.get('/file/*', (req, res) => {
  try {
    const filePath = req.path.substring('/file/'.length);
    const indexed = codeIndexer.getFileIndex(filePath);

    if (!indexed) {
      return res.status(404).json({ error: 'File not indexed' });
    }

    res.json({ indexed });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Search symbols
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = codeIndexer.searchSymbols(q as string);
    const formattedResults: Record<string, string[]> = {};

    results.forEach((files, symbol) => {
      formattedResults[symbol] = Array.from(files);
    });

    res.json({ results: formattedResults });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get all indexed files
router.get('/files', (req, res) => {
  try {
    const files = codeIndexer.getAllIndexedFiles();
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Clear index
router.delete('/', (req, res) => {
  try {
    codeIndexer.clearIndex();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
