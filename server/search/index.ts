// Search API Routes - India & Kerala Search backend.
// Endpoints:
//   GET  /api/search/health          - provider status
//   GET  /api/search?q=&type=web|images&district=&official=
//   POST /api/search/answer          - search + AI answer with citations
import { Router, Request, Response } from 'express';
import { SearchService, SearchType } from './SearchService';
import { Answerer } from './Answerer';
import { KERALA_DISTRICTS } from './QueryRouter';

const router = Router();
const searchService = new SearchService();
const answerer = new Answerer();

// GET /api/search/health - report which provider is active
router.get('/health', (_req: Request, res: Response) => {
  const provider = searchService.activeProvider();
  res.json({
    provider,
    hasResultsApi: provider !== 'links',
    aiAnswer: answerer.isGroundedAiAvailable() ? 'available' : 'extractive-fallback',
    districts: KERALA_DISTRICTS.length,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/search - web or image search
router.get('/', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    const type: SearchType = req.query.type === 'images' ? 'images' : 'web';
    const district = req.query.district ? String(req.query.district) : undefined;
    const official = req.query.official === 'true' || req.query.official === '1';
    const count = req.query.count ? Number(req.query.count) : undefined;

    if (!q) {
      return res.status(400).json({ error: 'Missing query parameter: q' });
    }
    if (q.length > 300) {
      return res.status(400).json({ error: 'Query too long (max 300 characters).' });
    }

    const result = await searchService.search(q, type, { district, officialOnly: official, count });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// POST /api/search/answer - retrieval-augmented answer with citations
router.post('/answer', async (req: Request, res: Response) => {
  try {
    const { q, district, official, count } = req.body || {};
    const question = String(q || '').trim();

    if (!question) {
      return res.status(400).json({ error: 'Missing required field: q' });
    }
    if (question.length > 300) {
      return res.status(400).json({ error: 'Query too long (max 300 characters).' });
    }

    const search = await searchService.search(question, 'web', {
      district: district ? String(district) : undefined,
      officialOnly: Boolean(official),
      count: count ? Number(count) : 8,
    });

    const results = search.web ?? [];
    const answer = await answerer.answer(question, results, search.district || 'India Kerala');

    res.json({
      question,
      resolvedQuery: search.resolvedQuery,
      region: search.region,
      district: search.district,
      official: search.official,
      provider: search.provider,
      answer,
      web: results,
      links: search.links,
      notice: search.notice,
    });
  } catch (error: any) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;