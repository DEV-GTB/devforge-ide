import express, { Request, Response, NextFunction } from 'express';
import { visionService } from './vision.service';
import { toVisionErrorPayload } from './vision.errors';

const router = express.Router();

function handle(
  fn: (req: Request, res: Response) => unknown | Promise<unknown>
) {
  return async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const result = await fn(req, res);
      if (result !== undefined && !res.headersSent) {
        res.json(result);
      }
    } catch (error) {
      const { status, body } = toVisionErrorPayload(error);
      if (!res.headersSent) res.status(status).json(body);
    }
  };
}

router.get('/capabilities', handle(() => {
  const capabilities = visionService.capabilities();
  return { capabilities, storage: visionService.storageStats() };
}));

// --- Sessions ---

router.post('/sessions', handle((req) => {
  const { url, viewport } = req.body ?? {};
  return visionService.createSession({ url, viewport }).then((session) => ({ session }));
}));

router.get('/sessions/:sessionId', handle((req) => ({
  session: visionService.getSession(req.params.sessionId),
})));

router.delete('/sessions/:sessionId', handle((req) => {
  visionService.deleteSession(req.params.sessionId);
  return { ok: true };
}));

router.post('/sessions/:sessionId/reload', handle((req) =>
  visionService.reloadSession(req.params.sessionId).then((session) => ({ session }))
));

// --- Screenshots ---

router.post('/sessions/:sessionId/screenshots', handle((req) => {
  const { dataUrl, label, mode } = req.body ?? {};
  return { screenshot: visionService.captureScreenshot(req.params.sessionId, { dataUrl, label, mode }) };
}));

router.get('/sessions/:sessionId/screenshots', handle((req) => ({
  screenshots: visionService.listScreenshots(req.params.sessionId),
})));

router.post('/screenshots/:screenshotId/set-baseline', handle((req) => ({
  screenshot: visionService.setBaseline(req.params.screenshotId),
})));

router.post('/screenshots/:screenshotId/pin', handle((req) => ({
  screenshot: visionService.setPinned(req.params.screenshotId, Boolean(req.body?.pinned)),
})));

router.delete('/screenshots/:screenshotId', handle((req) => {
  visionService.deleteScreenshot(req.params.screenshotId);
  return { ok: true };
}));

// --- Events ---

router.post('/sessions/:sessionId/events', handle((req) => {
  const event = visionService.recordEvent(req.params.sessionId, req.body ?? {});
  return { event };
}));

router.post('/sessions/:sessionId/events/batch', handle((req) => {
  const raw = Array.isArray(req.body?.events) ? req.body.events : [];
  const events = raw
    .slice(0, 500)
    .map((entry: unknown) =>
      visionService.recordEvent(req.params.sessionId, (entry ?? {}) as Record<string, unknown>)
    );
  return { events };
}));

router.get('/sessions/:sessionId/events', handle((req) => ({
  events: visionService.listEvents(
    req.params.sessionId,
    typeof req.query.severity === 'string' ? req.query.severity : undefined
  ),
})));

router.delete('/sessions/:sessionId/events', handle((req) => {
  visionService.clearEvents(req.params.sessionId);
  return { ok: true };
}));

// --- Diffs ---

router.post('/diffs', handle((req) => {
  const { baselineId, currentId, threshold, masks } = req.body ?? {};
  return { result: visionService.recordDiff({ baselineId, currentId, threshold, masks }) };
}));

router.get('/diffs/:diffId', handle((req) => ({
  result: visionService.getDiff(req.params.diffId),
})));

// --- AI analysis ---

router.post('/analysis/preview', handle((req) => {
  const body = req.body ?? {};
  // The full analysis function builds the bundle; expose a lightweight preview
  // by generating the same deterministic summary locally without a model call.
  return visionService
    .analyze({ ...body, question: undefined })
    .then(({ bundleText, evidenceIds }) => ({ bundleText, evidenceIds }));
}));

router.post('/analysis', handle((req) => visionService.analyze(req.body ?? {})));

// --- Issues ---

router.post('/issues', handle((req) => ({ issue: visionService.createIssue(req.body ?? {}) })));

router.get('/issues', handle(() => ({ issues: visionService.listIssues() })));

router.get('/issues/:issueId', handle((req) => ({
  issue: visionService.getIssue(req.params.issueId),
})));

router.get('/issues/:issueId/export', handle((req) => {
  const format = req.query.format === 'json' ? 'json' : 'markdown';
  return { format, content: visionService.exportIssue(req.params.issueId, format) };
}));

router.delete('/issues/:issueId', handle((req) => {
  visionService.deleteIssue(req.params.issueId);
  return { ok: true };
}));

// --- Artifacts / storage ---

router.get('/artifacts/:artifactId', handle((req, res) => {
  const { buffer, mimeType } = visionService.readArtifact(req.params.artifactId);
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.send(buffer);
}));

router.get('/storage', handle(() => ({ storage: visionService.storageStats() })));

router.delete('/history', handle(() => {
  const cleared = visionService.clearHistory();
  return { ok: true, cleared };
}));

router.get('/health', handle(() => ({ ok: true })));

export default router;
