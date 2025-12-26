import express from 'express';
import * as peopleService from '../services/peopleService.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { getOrSetCache } from '../config/redis.js';

const router = express.Router();

/**
 * GET /api/people
 * Get paginated list of people
 * Query params: page, limit, minSent, minReceived, sortBy
 */
router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit) || 50));

  const filters = {};
  if (req.query.search) filters.search = req.query.search;
  if (req.query.minSent) filters.minSent = parseInt(req.query.minSent);
  if (req.query.minReceived) filters.minReceived = parseInt(req.query.minReceived);
  if (req.query.sortBy) filters.sortBy = req.query.sortBy;

  const result = await peopleService.getPeople(page, limit, filters);

  res.json(result);
}));

/**
 * GET /api/people/:id
 * Get person by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    throw new ApiError(400, 'Invalid person ID');
  }

  const cacheKey = `person:${id}`;
  const person = await getOrSetCache(
    cacheKey,
    600, // 10 minutes
    () => peopleService.getPersonById(id)
  );

  if (!person) {
    throw new ApiError(404, 'Person not found');
  }

  res.json(person);
}));

/**
 * GET /api/people/:id/activity
 * Get person's email activity over time
 */
router.get('/:id/activity', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const granularity = req.query.granularity || 'week';

  if (isNaN(id)) {
    throw new ApiError(400, 'Invalid person ID');
  }

  if (!['day', 'week', 'month'].includes(granularity)) {
    throw new ApiError(400, 'Invalid granularity. Must be day, week, or month');
  }

  const cacheKey = `person:activity:${id}:${granularity}`;
  const activity = await getOrSetCache(
    cacheKey,
    300, // 5 minutes
    () => peopleService.getPersonActivity(id, granularity)
  );

  res.json({ activity });
}));

/**
 * GET /api/people/:id/contacts
 * Get person's top contacts
 */
router.get('/:id/contacts', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);

  if (isNaN(id)) {
    throw new ApiError(400, 'Invalid person ID');
  }

  const cacheKey = `person:contacts:${id}:${limit}`;
  const contacts = await getOrSetCache(
    cacheKey,
    300,
    () => peopleService.getPersonContacts(id, limit)
  );

  res.json({ contacts });
}));

/**
 * GET /api/people/:id/threads
 * Get threads a person participated in
 */
router.get('/:id/threads', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);

  if (isNaN(id)) {
    throw new ApiError(400, 'Invalid person ID');
  }

  const cacheKey = `person:threads:${id}:${page}:${limit}`;
  const result = await getOrSetCache(
    cacheKey,
    300,
    () => peopleService.getPersonThreads(id, page, limit)
  );

  res.json(result);
}));

export default router;
