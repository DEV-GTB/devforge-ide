import express from 'express';
import { PreviewService } from './PreviewService';

const router = express.Router();
const previewService = new PreviewService();

/**
 * Preview API Routes
 * Purpose: REST API for code preview and compilation
 * Endpoints:
 * - POST /api/preview/compile - Compile code for preview
 * - POST /api/preview/css - Compile CSS
 * - POST /api/preview/validate-html - Validate HTML
 * - DELETE /api/preview/cache - Clear preview cache
 * - GET /api/preview/cache - Get cache status
 */

// Compile code for preview
router.post('/compile', async (req, res) => {
  try {
    const { files } = req.body;
    if (!Array.isArray(files)) {
      return res.status(400).json({ error: 'Files must be an array' });
    }

    const result = await previewService.compilePreview(files);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Compile CSS
router.post('/css', async (req, res) => {
  try {
    const { css } = req.body;
    if (!css) {
      return res.status(400).json({ error: 'CSS is required' });
    }

    const compiled = await previewService.compileCSS(css);
    res.json({ success: true, css: compiled });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Validate HTML
router.post('/validate-html', async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) {
      return res.status(400).json({ error: 'HTML is required' });
    }

    const validation = await previewService.validateHTML(html);
    res.json(validation);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Clear cache
router.delete('/cache', (req, res) => {
  try {
    previewService.clearCache();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get cache status
router.get('/cache', (req, res) => {
  try {
    const size = previewService.getCacheSize();
    res.json({ size });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
