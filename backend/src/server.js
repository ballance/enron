import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { checkDatabaseHealth } from './config/database.js';
import { checkRedisHealth } from './config/redis.js';
import analyticsRoutes from './routes/analytics.js';
import peopleRoutes from './routes/people.js';
import networkRoutes from './routes/network.js';
import timelineRoutes from './routes/timeline.js';
import threadsRoutes from './routes/threads.js';
import searchRoutes from './routes/search.js';
import attachmentsRoutes from './routes/attachments.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(compression()); // Gzip compression for all responses
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const redisHealth = await checkRedisHealth();

  const isHealthy = dbHealth.healthy && redisHealth.healthy;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealth,
      redis: redisHealth,
    },
  });
});

// Mount API routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/threads', threadsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/attachments', attachmentsRoutes);

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Enron Email Visualization API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      analytics: '/api/analytics/*',
      people: '/api/people/*',
      network: '/api/network/*',
      threads: '/api/threads/*',
      timeline: '/api/timeline/*',
      search: '/api/search/*',
      attachments: '/api/attachments/*',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: true,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(50));
    console.log(`🚀 Enron Email API Server`);
    console.log(`📡 Listening on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
    console.log('='.repeat(50));
    console.log('');
  });
}

export default app;
