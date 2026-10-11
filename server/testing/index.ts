// Testing API Routes - Backend API for the Automatic Testing Agent.
// Endpoints:
//   GET  /api/testing/detect        - detect framework for a project
//   POST /api/testing/runs          - create + run a test run
//   GET  /api/testing/runs          - list recent runs
//   GET  /api/testing/runs/:id      - get a run + its event log
//   POST /api/testing/runs/:id/cancel - cancel a running run
//   POST /api/testing/runs/:id/repair - manually trigger a repair+retest
//   GET  /api/testing/history       - bounded summary history
import { Router, Request, Response } from 'express';
import { TestOrchestrator } from '../../src/features/testing/engine/TestOrchestrator';
import { TestEventBus } from '../../src/features/testing/telemetry/TestEvents';
import { TestPolicy } from '../../src/features/testing/policy/TestPolicy';
import { NodeTestRuntime } from './NodeTestRuntime';

const router = Router();

// Active runs: runId -> { orchestrator, runtime, state, eventBus, events }
const activeRuns = new Map<string, any>();

// Completed run summaries (bounded, newest first)
const runHistory: any[] = [];

interface CreateRunBody {
  projectId: string;
  projectPath: string;
  framework?: string;
  testFiles?: string[];
  timeoutMs?: number;
  coverage?: boolean;
  repair?: boolean;
  maxRepairAttempts?: number;
  mode?: string;
}

// GET /api/testing/detect?projectPath=... - detect framework
router.get('/detect', async (req: Request, res: Response) => {
  try {
    const projectPath = req.query.projectPath as string;
    if (!projectPath) {
      return res.status(400).json({ error: 'Missing projectPath query parameter' });
    }
    const runtime = new NodeTestRuntime(projectPath);
    const detection = await runtime.detectFramework();
    res.json({ detection });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/testing/runs - create and execute a test run
router.post('/runs', async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateRunBody;
    const { projectId, projectPath } = body;

    if (!projectId || !projectPath) {
      return res.status(400).json({ error: 'Missing required fields: projectId, projectPath' });
    }

    const runtime = new NodeTestRuntime(projectPath);
    const eventBus = new TestEventBus();
    const events: any[] = [];
    eventBus.on('*', (event) => events.push(event));

    const policy = new TestPolicy();
    const orchestrator = new TestOrchestrator({
      projectId,
      runtime,
      policy,
      eventBus,
      framework: (body.framework as any) || undefined,
    });

    const outcome = await orchestrator.runTests({
      projectPath,
      testFiles: body.testFiles,
      timeoutMs: body.timeoutMs,
      coverage: body.coverage,
      repair: body.repair,
      maxRepairAttempts: body.maxRepairAttempts,
      mode: (body.mode as any) || 'detect',
    });

    activeRuns.set(outcome.id, {
      orchestrator,
      runtime,
      policy,
      eventBus,
      events,
      outcome,
    });

    runHistory.unshift({
      runId: outcome.id,
      projectId,
      status: outcome.status,
      framework: outcome.framework,
      attempts: outcome.attempts,
      detectedTests: outcome.detectedTests ?? 0,
      totals: outcome.report?.totals,
      error: outcome.error,
      completedAt: new Date().toISOString(),
    });
    if (runHistory.length > 100) runHistory.length = 100;

    res.json({ runId: outcome.id, outcome, events });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/testing/runs - list recent runs
router.get('/runs', (_req: Request, res: Response) => {
  res.json({ sessions: runHistory });
});

// GET /api/testing/runs/:id - get run + event log
router.get('/runs/:id', (req: Request, res: Response) => {
  const run = activeRuns.get(req.params.id);
  if (!run) {
    const fromHistory = runHistory.find((r) => r.runId === req.params.id);
    return res.status(404).json({ error: 'Run not found', history: fromHistory ?? undefined });
  }
  res.json({
    outcome: run.outcome,
    events: run.events,
  });
});

// POST /api/testing/runs/:id/cancel - cancel a run
router.post('/runs/:id/cancel', async (req: Request, res: Response) => {
  try {
    const run = activeRuns.get(req.params.id);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    const outcome = await run.orchestrator.cancelRun(run.outcome);
    run.outcome = outcome;
    run.eventBus.emit({
      type: 'TEST_CANCELLED',
      runId: req.params.id,
      timestamp: new Date().toISOString(),
      message: 'Run cancelled',
    });
    res.json({ success: true, outcome });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/testing/runs/:id/repair - re-run failed tests (fresh run)
router.post('/runs/:id/repair', async (req: Request, res: Response) => {
  try {
    const run = activeRuns.get(req.params.id);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    const { projectId, projectPath } = run.outcome;
    const rerun = new TestOrchestrator({
      projectId,
      runtime: run.runtime,
      policy: run.policy || new TestPolicy(),
      eventBus: run.eventBus,
      framework: run.outcome.framework,
    });

    const outcome = await rerun.runTests({
      projectPath,
      testFiles: run.outcome.report?.suites.map((s: any) => s.file).filter(Boolean),
      coverage: true,
      repair: true,
      maxRepairAttempts: 3,
      mode: 'auto',
    });

    run.outcome = outcome;
    res.json({ runId: outcome.id, outcome, events: run.events });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/testing/history - list recent runs (aliases /runs listing)
router.get('/history', (_req: Request, res: Response) => {
  res.json({ sessions: runHistory });
});

export default router;