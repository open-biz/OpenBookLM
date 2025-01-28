import Redis from "ioredis";

// Lazy-loaded Redis client
let redis: Redis | null = null;

export function getRedisClient() {
  // Don't initialize Redis in the browser
  if (typeof window !== 'undefined') {
    return null;
  }

  // Skip Redis if URL not configured
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      // Disable automatic reconnection in development
      retryStrategy: process.env.NODE_ENV === 'development' ? () => null : undefined,
      // Reduce connection timeout in development
      connectTimeout: process.env.NODE_ENV === 'development' ? 1000 : 10000,
    });
  }

  return redis;
}

export default getRedisClient;
