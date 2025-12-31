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
// Extended for historical data that doesn't change
export const cacheTTL = {
  stats: 24 * 60 * 60,      // 24 hours
  lists: 12 * 60 * 60,      // 12 hours
  details: 60 * 60,         // 1 hour
  search: 60 * 60,          // 1 hour
};

// In-flight request deduplication to prevent cache stampede
const inFlightRequests = new Map();

// Helper function to get or set cache with stampede protection
export const getOrSetCache = async (key, ttl, fetchFunction) => {
  try {
    // Try to get from cache first
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // Check if there's already an in-flight request for this key
    if (inFlightRequests.has(key)) {
      // Wait for the existing request to complete
      return await inFlightRequests.get(key);
    }

    // Create a new promise for this fetch operation
    const fetchPromise = (async () => {
      try {
        const data = await fetchFunction();
        await redis.setex(key, ttl, JSON.stringify(data));
        return data;
      } finally {
        // Clean up the in-flight request
        inFlightRequests.delete(key);
      }
    })();

    // Store the promise so other requests can wait on it
    inFlightRequests.set(key, fetchPromise);

    return await fetchPromise;
  } catch (error) {
    console.error('Cache error:', error);
    inFlightRequests.delete(key);
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
