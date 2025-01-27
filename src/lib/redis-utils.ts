import redis from './redis';

// Cache TTL in seconds (e.g., 1 hour)
const DEFAULT_TTL = 3600;

/**
 * Set a value in Redis with optional TTL
 */
export async function setCacheValue(key: string, value: any, ttl = DEFAULT_TTL) {
  const serializedValue = JSON.stringify(value);
  await redis.setex(key, ttl, serializedValue);
}

/**
 * Get a value from Redis
 */
export async function getCacheValue<T>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  if (!value) return null;
  return JSON.parse(value) as T;
}

/**
 * Delete a value from Redis
 */
export async function deleteCacheValue(key: string) {
  await redis.del(key);
}

/**
 * Cache function results
 */
export async function cacheResult<T>(
  key: string,
  fn: () => Promise<T>,
  ttl = DEFAULT_TTL
): Promise<T> {
  const cached = await getCacheValue<T>(key);
  if (cached) return cached;

  const result = await fn();
  await setCacheValue(key, result, ttl);
  return result;
}

/**
 * Rate limiting utility
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  window: number
): Promise<boolean> {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, window);
  }
  return current <= limit;
}

/**
 * Lock utility for distributed operations
 */
export async function acquireLock(
  key: string,
  ttl = 30
): Promise<boolean> {
  // Use SET NX (only set if not exists) with expiry
  const result = await redis.set(
    `lock:${key}`,
    Date.now(),
    'EX',
    ttl,
    'NX'
  );
  return result === 'OK';
}

/**
 * Release a previously acquired lock
 */
export async function releaseLock(key: string): Promise<void> {
  await redis.del(`lock:${key}`);
}
