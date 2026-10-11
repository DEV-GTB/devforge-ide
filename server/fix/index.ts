// Fix API Routes - Backend API for fix operations
import { Router, Request, Response } from 'express';
import { FixOrchestrator } from '../../src/features/auto-fix/FixOrchestrator';
import { BuildAnalyzer } from '../../src/features/auto-fix/BuildAnalyzer';
import { FixPolicy, ApprovalLevel } from '../../src/features/auto-fix/FixPolicy';
import { PatchGenerator } from '../../src/features/auto-fix/PatchGenerator';
import { PatchValidator } from '../../src/features/auto-fix/PatchValidator';

const router = Router();

// Store active fix sessions
const fixSessions = new Map<string, any>();

// Completed fix session summaries (bounded, newest first)
const fixHistory: any[] = [];

// POST /api/fix/session - Start a new fix session
router.post('/session', async (req: Request, res: Response) => {
  try {
    const { projectId, projectPath, aiConfig, mode } = req.body;

    if (!projectId || !projectPath || !aiConfig) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sessionId = `FIX-${Date.now()}`;
    const policy = new FixPolicy(mode || 'standard');

    fixSessions.set(sessionId, {
      id: sessionId,
      projectId,
      projectPath,
      aiConfig,
      policy,
      status: 'created',
      createdAt: new Date(),
    });

    res.json({ sessionId, status: 'created' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/fix/session/:id - Get session status
router.get('/session/:id', (req: Request, res: Response) => {
  const session = fixSessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

// POST /api/fix/session/:id/analyze - Analyze project for errors
router.post('/session/:id/analyze', async (req: Request, res: Response) => {
  try {
    const session = fixSessions.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.status = 'analyzing';
    fixSessions.set(req.params.id, session);

    const analyzer = new BuildAnalyzer(session.projectPath);
    const buildResult = await analyzer.analyzeBuild();
    const typeCheckResult = await analyzer.analyzeTypeCheck();
    const lintResult = await analyzer.analyzeLint();

    const allErrors = [
      ...buildResult.errors,
      ...typeCheckResult.errors,
      ...lintResult.errors,
    ];

    session.errors = allErrors;
    session.diagnostics = {
      build: buildResult,
      typeCheck: typeCheckResult,
      lint: lintResult,
    };
    session.status = 'analyzed';

    fixSessions.set(req.params.id, session);

    res.json({
      errors: allErrors,
      diagnostics: session.diagnostics,
      errorCount: allErrors.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/fix/session/:id/classify - Classify errors
router.post('/session/:id/classify', async (req: Request, res: Response) => {
  try {
    const session = fixSessions.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { ErrorClassifier } = await import('../../src/features/auto-fix/ErrorClassifier');
    const classifier = new ErrorClassifier(session.projectId, session.aiConfig);

    const classified = await classifier.classify(session.errors || []);
    session.classifiedErrors = classified;
    session.status = 'classified';

    fixSessions.set(req.params.id, session);

    res.json({ classified });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/fix/session/:id/plan - Plan fixes
router.post('/session/:id/plan', async (req: Request, res: Response) => {
  try {
    const session = fixSessions.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { FixPlanner } = await import('../../src/features/auto-fix/FixPlanner');
    const planner = new FixPlanner(session.projectId, session.aiConfig);

    const fixes = await planner.planFixes(session.classifiedErrors || []);
    session.fixes = fixes;
    session.status = 'planned';

    fixSessions.set(req.params.id, session);

    res.json({ fixes, count: fixes.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/fix/session/:id/validate - Validate fixes against policy
router.post('/session/:id/validate', async (req: Request, res: Response) => {
  try {
    const session = fixSessions.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const policy = session.policy;
    const validations = [];

    for (const fix of session.fixes || []) {
      const decision = policy.evaluateFix(fix, fix.category || 'type');
      validations.push({
        file: fix.file,
        allowed: decision.allowed,
        reason: decision.reason,
        requiresManualApproval: decision.requiresManualApproval,
      });
    }

    session.validations = validations;
    session.status = 'validated';

    fixSessions.set(req.params.id, session);

    res.json({ validations });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/fix/session/:id/apply - Apply approved fixes
router.post('/session/:id/apply', async (req: Request, res: Response) => {
  try {
    const session = fixSessions.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { approvedFixes } = req.body;
    if (!approvedFixes || !Array.isArray(approvedFixes)) {
      return res.status(400).json({ error: 'approvedFixes array required' });
    }

    const generator = new PatchGenerator(session.projectPath);
    const validator = new PatchValidator(session.projectPath);

    const appliedPatches = [];
    const failedPatches = [];

    for (const fix of approvedFixes) {
      try {
        const patch = generator.generatePatch(fix, { createBackup: true });
        const validation = validator.validatePatch(patch);

        if (!validation.valid) {
          failedPatches.push({
            file: fix.file,
            reason: validation.errors.join(', '),
          });
          continue;
        }

        generator.applyPatch(patch);
        appliedPatches.push(patch);
      } catch (error: any) {
        failedPatches.push({
          file: fix.file,
          reason: error.message,
        });
      }
    }

    session.appliedPatches = appliedPatches;
    session.failedPatches = failedPatches;
    session.status = 'applied';

    fixSessions.set(req.params.id, session);

    res.json({
      applied: appliedPatches.length,
      failed: failedPatches.length,
      patches: appliedPatches,
      failures: failedPatches,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/fix/session/:id/verify - Verify fixes
router.post('/session/:id/verify', async (req: Request, res: Response) => {
  try {
    const session = fixSessions.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const analyzer = new BuildAnalyzer(session.projectPath);
    const buildResult = await analyzer.analyzeBuild();
    const typeCheckResult = await analyzer.analyzeTypeCheck();

    const remainingErrors = [
      ...buildResult.errors,
      ...typeCheckResult.errors,
    ];

    session.verification = {
      success: remainingErrors.length === 0,
      remainingErrors,
    };
    session.status = 'verified';

    fixSessions.set(req.params.id, session);

    res.json(session.verification);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/fix/session/:id/rollback - Rollback applied fixes
router.post('/session/:id/rollback', async (req: Request, res: Response) => {
  try {
    const session = fixSessions.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const generator = new PatchGenerator(session.projectPath);

    for (const patch of session.appliedPatches || []) {
      try {
        generator.revertPatch(patch);
      } catch (error) {
        console.error(`Failed to revert patch for ${patch.file}:`, error);
      }
    }

    session.status = 'rolled_back';
    fixSessions.set(req.params.id, session);

    res.json({ success: true, message: 'Patches rolled back' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/fix/session/:id - Delete session
router.delete('/session/:id', (req: Request, res: Response) => {
  const deleted = fixSessions.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({ success: true });
});

// POST /api/fix/session/:id/cancel - Cancel active fix session
router.post('/session/:id/cancel', (req: Request, res: Response) => {
  const session = fixSessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.status = 'cancelled';
  fixSessions.set(req.params.id, session);

  res.json({ success: true, status: 'cancelled' });
});

// POST /api/fix/session/:id/run - Run the full detect -> fix -> verify loop
router.post('/session/:id/run', async (req: Request, res: Response) => {
  try {
    const session = fixSessions.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { FixOrchestrator } = await import('../../src/features/auto-fix/FixOrchestrator');
    const { FixEventBus } = await import('../../src/features/auto-fix/telemetry/FixEvents');
    const { NodeFixRuntime } = await import('./NodeFixRuntime');

    const { mode, maxAttempts, policyMode, diagnostics } = req.body || {};

    const eventBus = new FixEventBus();
    const events: any[] = [];
    eventBus.on('*', (event) => events.push(event));

    const runtime = new NodeFixRuntime(session.projectPath, session.runtimeOptions);
    const orchestrator = new FixOrchestrator(session.projectId, session.aiConfig, runtime, {
      mode,
      maxAttempts,
      policyMode,
      eventBus,
      diagnostics,
    });

    session.status = 'running';
    fixSessions.set(req.params.id, session);

    const result = await orchestrator.fixEverything();

    session.status = String(result.status).toLowerCase();
    session.result = result;
    session.events = events;
    session.completedAt = new Date().toISOString();
    fixSessions.set(req.params.id, session);

    fixHistory.unshift({
      sessionId: req.params.id,
      projectId: session.projectId,
      success: result.success,
      status: result.status,
      attempts: result.attempts,
      changedFiles: result.changedFiles,
      errorsFound: result.errorsFound,
      errorsRemaining: result.errorsRemaining,
      rolledBack: result.rolledBack,
      completedAt: session.completedAt,
    });
    if (fixHistory.length > 100) fixHistory.length = 100;

    res.json({ result, events });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/fix/session/:id/events - Replay events (supports reconnect / resume)
router.get('/session/:id/events', (req: Request, res: Response) => {
  const session = fixSessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({ events: session.events || [] });
});

// GET /api/fix/history - List recent fix sessions
router.get('/history', (_req: Request, res: Response) => {
  res.json({ sessions: fixHistory });
});

export default router;
