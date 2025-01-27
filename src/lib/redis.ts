import { Redis } from 'ioredis';

// Lazy-loaded Redis client
let redis: Redis | null = null;

export function getRedisClient() {
  // During build time, always return null
  if (process.env.NODE_ENV === 'development') {
    if (!process.env.REDIS_URL) {
      return null;
    }
  }

  if (!redis && process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
  }

  return redis;
}

export default getRedisClient;
