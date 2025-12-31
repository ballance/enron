import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as attachmentService from '../services/attachmentService.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { getOrSetCache } from '../config/redis.js';

const router = express.Router();

// Get attachments directory from environment or default
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ATTACHMENTS_ROOT = process.env.ATTACHMENTS_DIR ||
  path.resolve(__dirname, '../../../extracted_data/attachments');

/**
 * GET /api/attachments/stats
 * Get attachment statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const cacheKey = 'attachments:stats';
  const stats = await getOrSetCache(
    cacheKey,
    3600, // 1 hour cache
    () => attachmentService.getAttachmentStats()
  );

  res.json(stats);
}));

/**
 * GET /api/attachments/search
 * Search attachments by filename
 * Query params: q, page, limit
 */
router.get('/search', asyncHandler(async (req, res) => {
  const { q: search } = req.query;

  if (!search || search.length < 2) {
    throw new ApiError(400, 'Search query must be at least 2 characters');
  }

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));

  const result = await attachmentService.searchAttachments(search, page, limit);
  res.json(result);
}));

/**
 * GET /api/attachments/messages
 * Get messages with attachments (paginated)
 * Query params: page, limit
 */
router.get('/messages', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));

  const cacheKey = `attachments:messages:${page}:${limit}`;
  const result = await getOrSetCache(
    cacheKey,
    300, // 5 minutes
    () => attachmentService.getMessagesWithAttachments(page, limit)
  );

  res.json(result);
}));

/**
 * GET /api/attachments/message/:messageId
 * Get all attachments for a specific message
 */
router.get('/message/:messageId', asyncHandler(async (req, res) => {
  const messageId = parseInt(req.params.messageId);

  if (isNaN(messageId)) {
    throw new ApiError(400, 'Invalid message ID');
  }

  const cacheKey = `attachments:message:${messageId}`;
  const attachments = await getOrSetCache(
    cacheKey,
    300, // 5 minutes
    () => attachmentService.getMessageAttachments(messageId)
  );

  res.json({ attachments });
}));

/**
 * GET /api/attachments/:id
 * Get attachment metadata by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const attachmentId = parseInt(req.params.id);

  if (isNaN(attachmentId)) {
    throw new ApiError(400, 'Invalid attachment ID');
  }

  const cacheKey = `attachment:meta:${attachmentId}`;
  const attachment = await getOrSetCache(
    cacheKey,
    3600, // 1 hour cache
    () => attachmentService.getAttachmentById(attachmentId)
  );

  if (!attachment) {
    throw new ApiError(404, 'Attachment not found');
  }

  res.json(attachment);
}));

/**
 * GET /api/attachments/:id/download
 * Download attachment file
 */
router.get('/:id/download', asyncHandler(async (req, res) => {
  const attachmentId = parseInt(req.params.id);

  if (isNaN(attachmentId)) {
    throw new ApiError(400, 'Invalid attachment ID');
  }

  const attachment = await attachmentService.getAttachmentById(attachmentId);

  if (!attachment) {
    throw new ApiError(404, 'Attachment not found');
  }

  const filePath = path.join(ATTACHMENTS_ROOT, attachment.storage_path);

  // Verify file exists
  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, 'Attachment file not found on disk');
  }

  // Determine filename for download
  const filename = attachment.original_filename || `attachment_${attachmentId}`;

  // Set headers
  res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
  res.setHeader('Content-Length', attachment.file_size);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(filename)}"`
  );

  // Stream file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}));

export default router;
