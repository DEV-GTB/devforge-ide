import express from 'express';
import { DeviceManager } from './DeviceManager';

const router = express.Router();
const deviceManager = new DeviceManager();

/**
 * Device API Routes
 * Purpose: REST API for device management
 * Endpoints:
 * - GET /api/devices - List all devices
 * - POST /api/devices - Register new device
 * - DELETE /api/devices/:id - Unregister device
 * - GET /api/devices/:id - Get device details
 * - POST /api/devices/:id/status - Update device status
 * - POST /api/devices/:id/sessions - Create session
 * - GET /api/devices/:id/sessions - Get device sessions
 * - POST /api/devices/:id/screenshot - Capture screenshot
 * - POST /api/devices/:id/tap - Tap on device
 * - POST /api/devices/:id/swipe - Swipe on device
 * - POST /api/devices/:id/type - Type on device
 * - POST /api/devices/:id/navigate - Navigate on device
 */

// List devices
router.get('/', (req, res) => {
  try {
    const { type, status } = req.query;
    let devices = deviceManager.getAllDevices();

    if (type) {
      devices = devices.filter(d => d.type === type);
    }

    if (status) {
      devices = devices.filter(d => d.status === status);
    }

    res.json({ devices });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Register device
router.post('/', (req, res) => {
  try {
    const device = deviceManager.registerDevice(req.body);
    res.json({ success: true, device });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Unregister device
router.delete('/:id', (req, res) => {
  try {
    deviceManager.unregisterDevice(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get device details
router.get('/:id', (req, res) => {
  try {
    const device = deviceManager.getDevice(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json({ device });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Update device status
router.post('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    deviceManager.updateDeviceStatus(req.params.id, status);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Create session
router.post('/:id/sessions', (req, res) => {
  try {
    const session = deviceManager.createSession(req.params.id);
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get device sessions
router.get('/:id/sessions', (req, res) => {
  try {
    const sessions = deviceManager.getDeviceSessions(req.params.id);
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Capture screenshot
router.post('/:id/screenshot', async (req, res) => {
  try {
    const screenshot = await deviceManager.captureScreenshot(req.params.id);
    res.json({ success: true, screenshot });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Tap on device
router.post('/:id/tap', async (req, res) => {
  try {
    const { x, y } = req.body;
    if (x === undefined || y === undefined) {
      return res.status(400).json({ error: 'x and y coordinates are required' });
    }
    await deviceManager.tap(req.params.id, x, y);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Swipe on device
router.post('/:id/swipe', async (req, res) => {
  try {
    const { startX, startY, endX, endY } = req.body;
    if (startX === undefined || startY === undefined || endX === undefined || endY === undefined) {
      return res.status(400).json({ error: 'All coordinates are required' });
    }
    await deviceManager.swipe(req.params.id, startX, startY, endX, endY);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Type on device
router.post('/:id/type', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    await deviceManager.type(req.params.id, text);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Navigate on device
router.post('/:id/navigate', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    await deviceManager.navigate(req.params.id, url);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
