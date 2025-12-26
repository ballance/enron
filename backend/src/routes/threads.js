import express from 'express';
import * as threadService from '../services/threadService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getOrSetCache } from '../config/redis.js';

const router = express.Router();

/**
 * GET /api/threads/mailbox/:personId
 * Get threads for a specific person's mailbox
 */
router.get('/mailbox/:personId', asyncHandler(async (req, res) => {
  const personId = parseInt(req.params.personId);
  const view = req.query.view || 'all'; // inbox, sent, all
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const sortBy = req.query.sortBy || 'end_date';

  if (isNaN(personId)) {
    return res.status(400).json({ error: 'Invalid person ID' });
  }

  if (!['inbox', 'sent', 'all'].includes(view)) {
    return res.status(400).json({ error: 'Invalid view. Must be inbox, sent, or all' });
  }

  const cacheKey = `threads:mailbox:${personId}:${view}:${page}:${limit}:${sortBy}`;
  const result = await getOrSetCache(
    cacheKey,
    300,
    () => threadService.getMailboxThreads(personId, view, page, limit, sortBy)
  );

  res.json(result);
}));

/**
 * GET /api/threads/mailbox/:personId/stats
 * Get mailbox statistics for a person
 */
router.get('/mailbox/:personId/stats', asyncHandler(async (req, res) => {
  const personId = parseInt(req.params.personId);

  if (isNaN(personId)) {
    return res.status(400).json({ error: 'Invalid person ID' });
  }

  const cacheKey = `threads:mailbox:stats:${personId}`;
  const stats = await getOrSetCache(
    cacheKey,
    600, // 10 minutes
    () => threadService.getMailboxStats(personId)
  );

  res.json(stats);
}));

/**
 * GET /api/threads
 * Get paginated list of threads with sorting
 */
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const sortBy = req.query.sortBy || 'message_count';

  const cacheKey = `threads:list:${page}:${limit}:${sortBy}`;
  const result = await getOrSetCache(
    cacheKey,
    300, // 5 minutes
    () => threadService.getThreads(page, limit, sortBy)
  );

  res.json(result);
}));

/**
 * GET /api/threads/:id
 * Get thread details
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const threadId = parseInt(req.params.id);

  if (isNaN(threadId)) {
    return res.status(400).json({ error: 'Invalid thread ID' });
  }

  const cacheKey = `threads:detail:${threadId}`;
  const thread = await getOrSetCache(
    cacheKey,
    300,
    () => threadService.getThreadById(threadId)
  );

  if (!thread) {
    return res.status(404).json({ error: 'Thread not found' });
  }

  res.json(thread);
}));

/**
 * GET /api/threads/:id/tree
 * Get hierarchical tree structure of thread messages
 * Query params: limit (default 1000)
 */
router.get('/:id/tree', asyncHandler(async (req, res) => {
  const threadId = parseInt(req.params.id);
  const limit = parseInt(req.query.limit) || 1000;

  if (isNaN(threadId)) {
    return res.status(400).json({ error: 'Invalid thread ID' });
  }

  const cacheKey = `threads:tree:${threadId}:${limit}`;
  const result = await getOrSetCache(
    cacheKey,
    300,
    () => threadService.getThreadTree(threadId, limit)
  );

  res.json(result);
}));

/**
 * GET /api/threads/:id/messages
 * Get chronological list of messages in thread
 * Query params: page, limit
 */
router.get('/:id/messages', asyncHandler(async (req, res) => {
  const threadId = parseInt(req.params.id);
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);

  if (isNaN(threadId)) {
    return res.status(400).json({ error: 'Invalid thread ID' });
  }

  const cacheKey = `threads:messages:${threadId}:${page}:${limit}`;
  const result = await getOrSetCache(
    cacheKey,
    300,
    () => threadService.getThreadMessages(threadId, page, limit)
  );

  res.json(result);
}));

/**
 * GET /api/threads/:id/participants
 * Get list of participants in thread
 */
router.get('/:id/participants', asyncHandler(async (req, res) => {
  const threadId = parseInt(req.params.id);

  if (isNaN(threadId)) {
    return res.status(400).json({ error: 'Invalid thread ID' });
  }

  const cacheKey = `threads:participants:${threadId}`;
  const participants = await getOrSetCache(
    cacheKey,
    300,
    () => threadService.getThreadParticipants(threadId)
  );

  res.json({ participants });
}));

export default router;
