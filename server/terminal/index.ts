import express from 'express';
import { TerminalService } from './TerminalService';

const router = express.Router();
const terminalService = new TerminalService();

/**
 * Terminal API Routes
 * Purpose: REST API for terminal session management
 * Endpoints:
 * - POST /api/terminal/sessions - Create new session
 * - GET /api/terminal/sessions - List all sessions
 * - GET /api/terminal/sessions/:id - Get session details
 * - DELETE /api/terminal/sessions/:id - Delete session
 * - POST /api/terminal/sessions/:id/execute - Execute command
 * - POST /api/terminal/sessions/:id/cd - Change directory
 * - POST /api/terminal/sessions/:id/env - Set environment variable
 * - GET /api/terminal/sessions/:id/history - Get command history
 * - DELETE /api/terminal/sessions/:id/history - Clear history
 * - POST /api/terminal/sessions/:id/terminate - Terminate session
 */

// Create session
router.post('/sessions', (req, res) => {
  try {
    const { cwd } = req.body;
    const session = terminalService.createSession(cwd);
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// List sessions
router.get('/sessions', (req, res) => {
  try {
    const sessions = terminalService.getAllSessions();
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get session details
router.get('/sessions/:id', (req, res) => {
  try {
    const session = terminalService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Delete session
router.delete('/sessions/:id', (req, res) => {
  try {
    terminalService.deleteSession(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Execute command
router.post('/sessions/:id/execute', async (req, res) => {
  try {
    const { command, timeout } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const result = await terminalService.executeCommand(req.params.id, command, timeout);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Change directory
router.post('/sessions/:id/cd', (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      return res.status(400).json({ error: 'Path is required' });
    }

    terminalService.changeDirectory(req.params.id, path);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Set environment variable
router.post('/sessions/:id/env', (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    terminalService.setEnvironmentVariable(req.params.id, key, value);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get command history
router.get('/sessions/:id/history', (req, res) => {
  try {
    const history = terminalService.getSessionHistory(req.params.id);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Clear history
router.delete('/sessions/:id/history', (req, res) => {
  try {
    terminalService.clearSessionHistory(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Terminate session
router.post('/sessions/:id/terminate', (req, res) => {
  try {
    terminalService.terminateSession(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
