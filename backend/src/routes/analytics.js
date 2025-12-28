import express from 'express';
import { getOverallStats, getTopSenders, getTopReceivers } from '../services/analyticsService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getOrSetCache, cacheKeys, cacheTTL } from '../config/redis.js';

const router = express.Router();

/**
 * GET /api/analytics/stats
 * Get overall statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await getOrSetCache(
    cacheKeys.stats(),
    cacheTTL.stats,
    () => getOverallStats()
  );

  res.json(stats);
}));

/**
 * GET /api/analytics/top-senders
 * Get top email senders
 * Query params: limit (default: 20, max: 100)
 */
router.get('/top-senders', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  const senders = await getOrSetCache(
    cacheKeys.topSenders(limit),
    cacheTTL.lists,
    () => getTopSenders(limit)
  );

  res.json({
    data: senders,
    limit
  });
}));

/**
 * GET /api/analytics/top-receivers
 * Get top email receivers
 * Query params: limit (default: 20, max: 100)
 */
router.get('/top-receivers', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  const receivers = await getOrSetCache(
    cacheKeys.topReceivers(limit),
    cacheTTL.lists,
    () => getTopReceivers(limit)
  );

  res.json({
    data: receivers,
    limit
  });
}));

/**
 * GET /api/analytics/dashboard
 * Batched endpoint for dashboard - returns stats, top senders, and top receivers in one request
 * Query params: limit (default: 10, max: 100) - applies to top senders/receivers
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);

  // Fetch all three in parallel
  const [stats, topSenders, topReceivers] = await Promise.all([
    getOrSetCache(cacheKeys.stats(), cacheTTL.stats, () => getOverallStats()),
    getOrSetCache(cacheKeys.topSenders(limit), cacheTTL.lists, () => getTopSenders(limit)),
    getOrSetCache(cacheKeys.topReceivers(limit), cacheTTL.lists, () => getTopReceivers(limit)),
  ]);

  res.json({
    stats,
    topSenders: { data: topSenders, limit },
    topReceivers: { data: topReceivers, limit },
  });
}));

export default router;
