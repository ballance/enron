import express from 'express';
import {
  getEmailVolume,
  getHourlyActivity,
  getDailyActivity,
  getActivityHeatmap
} from '../services/timelineService.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { getOrSetCache, cacheTTL } from '../config/redis.js';

const router = express.Router();

/**
 * GET /api/timeline/volume
 * Get email volume over time
 * Query params: granularity (day/week/month), startDate, endDate
 */
router.get('/volume', asyncHandler(async (req, res) => {
  const granularity = req.query.granularity || 'day';
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  if (!['day', 'week', 'month'].includes(granularity)) {
    throw new ApiError(400, 'Invalid granularity. Must be day, week, or month');
  }

  const cacheKey = `timeline:volume:${granularity}:${startDate || 'all'}:${endDate || 'all'}`;

  const data = await getOrSetCache(
    cacheKey,
    cacheTTL.lists,
    () => getEmailVolume({ granularity, startDate, endDate })
  );

  res.json({ data, granularity });
}));

/**
 * GET /api/timeline/hourly
 * Get hourly email activity (0-23 hours)
 * Query params: startDate, endDate
 */
router.get('/hourly', asyncHandler(async (req, res) => {
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  const cacheKey = `timeline:hourly:${startDate || 'all'}:${endDate || 'all'}`;

  const data = await getOrSetCache(
    cacheKey,
    cacheTTL.lists,
    () => getHourlyActivity({ startDate, endDate })
  );

  res.json({ data });
}));

/**
 * GET /api/timeline/daily
 * Get daily email activity (Sunday-Saturday)
 * Query params: startDate, endDate
 */
router.get('/daily', asyncHandler(async (req, res) => {
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  const cacheKey = `timeline:daily:${startDate || 'all'}:${endDate || 'all'}`;

  const data = await getOrSetCache(
    cacheKey,
    cacheTTL.lists,
    () => getDailyActivity({ startDate, endDate })
  );

  res.json({ data });
}));

/**
 * GET /api/timeline/heatmap
 * Get activity heatmap (24 hours x 7 days)
 * Query params: startDate, endDate
 */
router.get('/heatmap', asyncHandler(async (req, res) => {
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  const cacheKey = `timeline:heatmap:${startDate || 'all'}:${endDate || 'all'}`;

  const data = await getOrSetCache(
    cacheKey,
    cacheTTL.lists,
    () => getActivityHeatmap({ startDate, endDate })
  );

  res.json({ data });
}));

export default router;
