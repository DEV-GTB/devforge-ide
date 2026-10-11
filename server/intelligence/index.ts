// Project Intelligence API Routes
import express from 'express';
import { ProjectContextProvider } from '../../src/features/project-intelligence/ProjectContextProvider';

const router = express.Router();

// In-memory storage for providers (in production, use a database)
const providers: Map<string, ProjectContextProvider> = new Map();

/**
 * Initialize project intelligence for a project
 * POST /api/intelligence/initialize
 */
router.post('/initialize', async (req, res) => {
  try {
    const { projectId, projectPath, aiConfig, maxBudget } = req.body;

    if (!projectId || !projectPath || !aiConfig) {
      return res.status(400).json({ error: 'Missing required fields: projectId, projectPath, aiConfig' });
    }

    const provider = new ProjectContextProvider({
      projectId,
      projectPath,
      aiConfig,
      maxBudget,
    });

    providers.set(projectId, provider);

    res.json({ success: true, projectId });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Index entire project
 * POST /api/intelligence/:projectId/index
 */
router.post('/:projectId/index', async (req, res) => {
  try {
    const { projectId } = req.params;
    const provider = providers.get(projectId);

    if (!provider) {
      return res.status(404).json({ error: 'Project not initialized' });
    }

    await provider.indexProject();

    res.json({ success: true, message: 'Project indexed successfully' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Index single file
 * POST /api/intelligence/:projectId/index/file
 */
router.post('/:projectId/index/file', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { path, content } = req.body;
    const provider = providers.get(projectId);

    if (!provider) {
      return res.status(404).json({ error: 'Project not initialized' });
    }

    if (!path || !content) {
      return res.status(400).json({ error: 'Missing required fields: path, content' });
    }

    await provider.indexFile(path, content);

    res.json({ success: true, message: 'File indexed successfully' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Search project
 * POST /api/intelligence/:projectId/search
 */
router.post('/:projectId/search', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { query, mode, limit, currentFile, openFiles, selectedSymbol } = req.body;
    const provider = providers.get(projectId);

    if (!provider) {
      return res.status(404).json({ error: 'Project not initialized' });
    }

    if (!query) {
      return res.status(400).json({ error: 'Missing required field: query' });
    }

    const results = await provider.search({
      projectId,
      query,
      mode: mode || 'hybrid',
      limit: limit || 10,
      currentFile,
      openFiles,
      selectedSymbol,
    });

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Build context for AI
 * POST /api/intelligence/:projectId/context
 */
router.post('/:projectId/context', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { task, maxTokens, currentFile, openFiles, selectedSymbol, needTests, needHistory } = req.body;
    const provider = providers.get(projectId);

    if (!provider) {
      return res.status(404).json({ error: 'Project not initialized' });
    }

    if (!task) {
      return res.status(400).json({ error: 'Missing required field: task' });
    }

    const context = await provider.buildContext({
      projectId,
      task,
      maxTokens,
      currentFile,
      openFiles,
      selectedSymbol,
      needTests,
      needHistory,
    });

    res.json({ context });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Assemble context with budget management
 * POST /api/intelligence/:projectId/context/assemble
 */
router.post('/:projectId/context/assemble', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { task, maxTokens, currentFile, openFiles, budget } = req.body;
    const provider = providers.get(projectId);

    if (!provider) {
      return res.status(404).json({ error: 'Project not initialized' });
    }

    if (!task) {
      return res.status(400).json({ error: 'Missing required field: task' });
    }

    const assembled = await provider.assembleContext(
      {
        projectId,
        task,
        maxTokens,
        currentFile,
        openFiles,
      },
      budget
    );

    res.json({ assembled });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Add architectural decision
 * POST /api/intelligence/:projectId/decisions
 */
router.post('/:projectId/decisions', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { decision } = req.body;
    const provider = providers.get(projectId);

    if (!provider) {
      return res.status(404).json({ error: 'Project not initialized' });
    }

    if (!decision) {
      return res.status(400).json({ error: 'Missing required field: decision' });
    }

    const result = provider.addDecision(decision);

    res.json({ success: true, decision: result });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Get decisions
 * GET /api/intelligence/:projectId/decisions
 */
router.get('/:projectId/decisions', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { category, status, source, tags, minConfidence } = req.query;
    const provider = providers.get(projectId);

    if (!provider) {
      return res.status(404).json({ error: 'Project not initialized' });
    }

    const filter: any = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (tags) filter.tags = Array.isArray(tags) ? tags : [tags];
    if (minConfidence) filter.minConfidence = parseFloat(minConfidence as string);

    const decisions = provider.getDecisions(filter);

    res.json({ decisions });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Search decisions
 * GET /api/intelligence/:projectId/decisions/search
 */
router.get('/:projectId/decisions/search', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { q } = req.query;
    const provider = providers.get(projectId);

    if (!provider) {
      return res.status(404).json({ error: 'Project not initialized' });
    }

    if (!q) {
      return res.status(400).json({ error: 'Missing required query parameter: q' });
    }

    const decisions = provider.searchDecisions(q as string);

    res.json({ decisions });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Get recent Git commits
 * GET /api/intelligence/:projectId/git/commits
 */
router.get('/:projectId/git/commits', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit } = req.query;
    const provider = providers.get(projectId);

    if (!provider) {
      return res.status(404).json({ error: 'Project not initialized' });
    }

    const commits = await provider.getRecentCommits(limit ? parseInt(limit as string) : undefined);

    res.json({ commits });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Get file history
 * GET /api/intelligence/:projectId/git/history/:filePath
 */
router.get('/:projectId/git/history/*', async (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = req.path.substring(`/api/intelligence/${projectId}/git/history/`.length);
    const { limit } = req.query;
    const provider = providers.get(projectId);

    if (!provider) {
      return res.status(404).json({ error: 'Project not initialized' });
    }

    const history = await provider.getFileHistory(
      decodeURIComponent(filePath),
      limit ? parseInt(limit as string) : undefined
    );

    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Get related files based on Git history
 * GET /api/intelligence/:projectId/git/related/:filePath
 */
router.get('/:projectId/git/related/*', async (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = req.path.substring(`/api/intelligence/${projectId}/git/related/`.length);
    const { threshold } = req.query;
    const provider = providers.get(projectId);

    if (!provider) {
      return res.status(404).json({ error: 'Project not initialized' });
    }

    const related = await provider.getRelatedFiles(
      decodeURIComponent(filePath),
      threshold ? parseInt(threshold as string) : undefined
    );

    res.json({ related });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Parse file
 * POST /api/intelligence/:projectId/parse
 */
router.post('/:projectId/parse', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { content, filePath } = req.body;
    const provider = providers.get(projectId);

    if (!provider) {
      return res.status(404).json({ error: 'Project not initialized' });
    }

    if (!content || !filePath) {
      return res.status(400).json({ error: 'Missing required fields: content, filePath' });
    }

    const result = await provider.parseFile(content, filePath);

    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Scan for secrets
 * POST /api/intelligence/:projectId/secrets/scan
 */
router.post('/:projectId/secrets/scan', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { content, filePath } = req.body;
    const provider = providers.get(projectId);

    if (!provider) {
      return res.status(404).json({ error: 'Project not initialized' });
    }

    if (!content || !filePath) {
      return res.status(400).json({ error: 'Missing required fields: content, filePath' });
    }

    const result = provider.scanForSecrets(content, filePath);

    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Check health
 * GET /api/intelligence/:projectId/health
 */
router.get('/:projectId/health', async (req, res) => {
  try {
    const { projectId } = req.params;
    const provider = providers.get(projectId);

    if (!provider) {
      return res.status(404).json({ error: 'Project not initialized' });
    }

    const health = await provider.checkHealth();

    res.json({ health });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Get index queue stats
 * GET /api/intelligence/:projectId/queue/stats
 */
router.get('/:projectId/queue/stats', async (req, res) => {
  try {
    const { projectId } = req.params;
    const provider = providers.get(projectId);

    if (!provider) {
      return res.status(404).json({ error: 'Project not initialized' });
    }

    const stats = provider.getIndexStats();

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Set max budget
 * POST /api/intelligence/:projectId/budget
 */
router.post('/:projectId/budget', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { max } = req.body;
    const provider = providers.get(projectId);

    if (!provider) {
      return res.status(404).json({ error: 'Project not initialized' });
    }

    if (!max) {
      return res.status(400).json({ error: 'Missing required field: max' });
    }

    provider.setMaxBudget(max);

    res.json({ success: true, maxBudget: max });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Cleanup project
 * DELETE /api/intelligence/:projectId
 */
router.delete('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const provider = providers.get(projectId);

    if (!provider) {
      return res.status(404).json({ error: 'Project not initialized' });
    }

    provider.dispose();
    providers.delete(projectId);

    res.json({ success: true, message: 'Project cleaned up successfully' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
