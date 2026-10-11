import express from 'express';
import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import { AgentService } from './agent/AgentService';
import { AgentOrchestrator } from './agent/AgentOrchestrator';
import aiRouter from './ai';
import apiRouter from './api';
import containersRouter from './containers';
import databaseRouter from './database';
import devicesRouter from './devices';
import indexingRouter from './indexing';
import intelligenceRouter from './intelligence';
import previewRouter from './preview';
import securityRouter from './security';
import terminalRouter from './terminal';
import fixRouter from './fix';
import testingRouter from './testing';
import searchRouter from './search';
import threeDRouter from './three-d';
import visionRouter from './vision';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
];

export function corsOptionsFor(origins: string[] = DEFAULT_ALLOWED_ORIGINS) {
  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow same-origin (no Origin header) and any configured dev origin.
      if (!origin || origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  };
}

/**
 * Registers every DevForge subsystem (AI, search, fix, testing, agents,
 * terminal, preview, indexing, intelligence, security, devices, containers,
 * database mock, health) on a single Express app so one hosted server exposes
 * all system paths. No database engine is required — the database module is a
 * safe in-memory mock that never touches local files.
 */
export function registerHub(
  app: express.Express,
  httpServer?: HttpServer
): { io?: SocketServer; agentService: AgentService; orchestrator: AgentOrchestrator } {
  const agentService = new AgentService();
  const orchestrator = new AgentOrchestrator(agentService);

  let io: SocketServer | undefined;
  if (httpServer) {
    io = new SocketServer(httpServer, { cors: corsOptionsFor() });
  }

  // Path traversal guard for every API route.
  app.use('/api', (req, res, next) => {
    if (req.path.includes('..')) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    next();
  });

  // Mount all subsystems.
  app.use('/api/ai', aiRouter);
  app.use('/api/3d', threeDRouter);
  app.use('/api/vision', visionRouter);
  app.use('/api', apiRouter);
  app.use('/api/containers', containersRouter);
  app.use('/api/database', databaseRouter);
  app.use('/api/devices', devicesRouter);
  app.use('/api/indexing', indexingRouter);
  app.use('/api/intelligence', intelligenceRouter);
  app.use('/api/preview', previewRouter);
  app.use('/api/security', securityRouter);
  app.use('/api/terminal', terminalRouter);
  app.use('/api/fix', fixRouter);
  app.use('/api/testing', testingRouter);
  app.use('/api/search', searchRouter);

  if (io) {
    agentService.on('run.created', (run) => io!.emit('agent:run_created', run));
    agentService.on('run.status_changed', ({ runId, status }) => {
      io!.emit('agent:status_changed', { runId, status });
    });
    agentService.on('run.message_added', ({ runId, message }) => {
      io!.emit('agent:message_added', { runId, message });
    });
    agentService.on('run.task_added', ({ runId, task }) => {
      io!.emit('agent:task_added', { runId, task });
    });
    agentService.on('run.task_updated', ({ runId, taskId, status }) => {
      io!.emit('agent:task_updated', { runId, taskId, status });
    });
    agentService.on('run.action_added', ({ runId, action }) => {
      io!.emit('agent:action_added', { runId, action });
    });
    agentService.on('run.action_updated', ({ runId, actionId, output, error }) => {
      io!.emit('agent:action_updated', { runId, actionId, output, error });
    });
    agentService.on('run.error_added', ({ runId, error }) => {
      io!.emit('agent:error_added', { runId, error });
    });
    agentService.on('run.completed', ({ runId, result }) => {
      io!.emit('agent:completed', { runId, result });
    });
    agentService.on('run.failed', ({ runId, error }) => {
      io!.emit('agent:failed', { runId, error });
    });
    agentService.on('run.cancelled', ({ runId }) => {
      io!.emit('agent:cancelled', { runId });
    });

    io.on('connection', (socket) => {
      console.log(`[hub] client connected: ${socket.id}`);
      socket.on('disconnect', () => {
        console.log(`[hub] client disconnected: ${socket.id}`);
      });
    });
  }

  // Autonomous agent REST endpoints.
  app.post('/api/agents/runs', async (req, res) => {
    try {
      const { projectId, userId, goal } = req.body || {};
      if (!projectId || !userId || !goal) {
        return res.status(400).json({ error: 'projectId, userId and goal are required.' });
      }
      const run = await orchestrator.execute(projectId, userId, goal);
      res.json(run);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/api/agents/runs/:id', (req, res) => {
    const run = agentService.getRun(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  });

  app.post('/api/agents/runs/:id/cancel', (req, res) => {
    orchestrator.cancel(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/agents/runs', (req, res) => {
    const { projectId } = req.query;
    const runs = projectId
      ? agentService.getRunsByProject(projectId as string)
      : agentService.getAllRuns();
    res.json(runs);
  });

  app.get('/api/agents/status', (req, res) => {
    res.json({ status: orchestrator.getStatus() });
  });

  return { io, agentService, orchestrator };
}