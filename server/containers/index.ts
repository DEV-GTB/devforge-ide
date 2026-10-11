import express from 'express';
import { ContainerManager } from './ContainerManager';

const router = express.Router();
const containerManager = new ContainerManager();

/**
 * Container API Routes
 * Purpose: REST API for Docker container management
 * Endpoints:
 * - GET /api/containers - List all containers
 * - POST /api/containers/:id/start - Start container
 * - POST /api/containers/:id/stop - Stop container
 * - POST /api/containers/:id/restart - Restart container
 * - DELETE /api/containers/:id - Remove container
 * - GET /api/containers/:id/logs - Get container logs
 * - POST /api/containers/:id/exec - Execute command in container
 * - POST /api/containers - Create new container
 * - GET /api/containers/:id/stats - Get container stats
 */

// List containers
router.get('/', async (req, res) => {
  try {
    const { all } = req.query;
    const containers = await containerManager.listContainers(all === 'true');
    res.json({ containers, available: containerManager.isAvailable() });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Start container
router.post('/:id/start', async (req, res) => {
  try {
    await containerManager.startContainer(req.params.id);
    res.json({ success: true, message: 'Container started' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Stop container
router.post('/:id/stop', async (req, res) => {
  try {
    await containerManager.stopContainer(req.params.id);
    res.json({ success: true, message: 'Container stopped' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Restart container
router.post('/:id/restart', async (req, res) => {
  try {
    await containerManager.restartContainer(req.params.id);
    res.json({ success: true, message: 'Container restarted' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Remove container
router.delete('/:id', async (req, res) => {
  try {
    const { force } = req.query;
    await containerManager.removeContainer(req.params.id, force === 'true');
    res.json({ success: true, message: 'Container removed' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get container logs
router.get('/:id/logs', async (req, res) => {
  try {
    const { tail } = req.query;
    const logs = await containerManager.getContainerLogs(req.params.id, parseInt(tail as string) || 100);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Execute command in container
router.post('/:id/exec', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    const output = await containerManager.executeCommand(req.params.id, command);
    res.json({ output });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Create container
router.post('/', async (req, res) => {
  try {
    const config = req.body;
    const containerId = await containerManager.createContainer(config);
    res.json({ success: true, containerId });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get container stats
router.get('/:id/stats', async (req, res) => {
  try {
    const stats = await containerManager.getContainerStats(req.params.id);
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
