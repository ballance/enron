import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis client configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  console.log('✓ Connected to Redis cache');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Cache key helpers
export const cacheKeys = {
  stats: () => 'analytics:stats',
  topSenders: (limit) => `analytics:top-senders:${limit}`,
  topReceivers: (limit) => `analytics:top-receivers:${limit}`,
  networkGraph: (filters) => `network:graph:${JSON.stringify(filters)}`,
  person: (id) => `people:${id}`,
  thread: (id) => `threads:${id}`,
  threadTree: (id) => `threads:${id}:tree`,
};

// Cache TTL (Time To Live) in seconds
export const cacheTTL = {
  stats: 24 * 60 * 60,      // 24 hours
  lists: 60 * 60,           // 1 hour
  details: 5 * 60,          // 5 minutes
  search: 5 * 60,           // 5 minutes
};

// Helper function to get or set cache
export const getOrSetCache = async (key, ttl, fetchFunction) => {
  try {
    // Try to get from cache
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // If not in cache, fetch data
    const data = await fetchFunction();

    // Store in cache
    await redis.setex(key, ttl, JSON.stringify(data));

    return data;
  } catch (error) {
    console.error('Cache error:', error);
    // If cache fails, just fetch data directly
    return await fetchFunction();
  }
};

// Health check function
export const checkRedisHealth = async () => {
  try {
    await redis.ping();
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
};

export default redis;
