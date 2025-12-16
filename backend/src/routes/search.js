import express from 'express';
import * as searchService from '../services/searchService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getOrSetCache } from '../config/redis.js';

const router = express.Router();

/**
 * GET /api/search
 * Search across people, threads, and messages
 * Query params: q (query), type (all|people|threads|messages), limit
 */
router.get('/', asyncHandler(async (req, res) => {
  const query = req.query.q || '';
  const type = req.query.type || 'all';
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  if (!query || query.trim().length < 2) {
    return res.json({ people: [], threads: [], messages: [] });
  }

  if (!['all', 'people', 'threads', 'messages'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type. Must be all, people, threads, or messages' });
  }

  const cacheKey = `search:${query}:${type}:${limit}`;
  const results = await getOrSetCache(
    cacheKey,
    300, // 5 minutes
    () => searchService.search(query, type, limit)
  );

  res.json(results);
}));

/**
 * GET /api/search/autocomplete
 * Get autocomplete suggestions
 * Query params: q (query), limit
 */
router.get('/autocomplete', asyncHandler(async (req, res) => {
  const query = req.query.q || '';
  const limit = Math.min(parseInt(req.query.limit) || 5, 10);

  if (!query || query.trim().length < 2) {
    return res.json([]);
  }

  const cacheKey = `search:autocomplete:${query}:${limit}`;
  const suggestions = await getOrSetCache(
    cacheKey,
    300,
    () => searchService.autocomplete(query, limit)
  );

  res.json(suggestions);
}));

export default router;
