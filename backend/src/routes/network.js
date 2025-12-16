import express from 'express';
import { getNetworkGraph, getPersonNetwork } from '../services/networkService.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { getOrSetCache, cacheTTL } from '../config/redis.js';

const router = express.Router();

/**
 * GET /api/network/graph
 * Get network graph data
 * Query params: minEmails (default: 5), limit (default: 500, max: 1000)
 */
router.get('/graph', asyncHandler(async (req, res) => {
  const minEmails = parseInt(req.query.minEmails) || 5;
  const limit = Math.min(parseInt(req.query.limit) || 500, 1000);

  const cacheKey = `network:graph:${minEmails}:${limit}`;

  const graph = await getOrSetCache(
    cacheKey,
    cacheTTL.lists,
    () => getNetworkGraph({ minEmails, limit })
  );

  res.json(graph);
}));

/**
 * GET /api/network/person/:id
 * Get ego network for a specific person
 * Query params: depth (default: 1), minEmails (default: 1)
 */
router.get('/person/:id', asyncHandler(async (req, res) => {
  const personId = parseInt(req.params.id);

  if (isNaN(personId)) {
    throw new ApiError(400, 'Invalid person ID');
  }

  const depth = Math.min(parseInt(req.query.depth) || 1, 2);
  const minEmails = parseInt(req.query.minEmails) || 1;

  const cacheKey = `network:person:${personId}:${depth}:${minEmails}`;

  const graph = await getOrSetCache(
    cacheKey,
    cacheTTL.details,
    () => getPersonNetwork(personId, { depth, minEmails })
  );

  res.json(graph);
}));

export default router;
