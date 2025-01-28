import { getRedisClient } from './redis';

// Cache TTL in seconds (e.g., 1 hour)
const DEFAULT_TTL = 3600;

export async function setChatHistory(
  userId: string,
  notebookId: string,
  messages: any[]
) {
  try {
    const redis = getRedisClient();
    if (!redis) {
      // In browser or when Redis is not available, use memory cache
      return null;
    }
    const key = `chat:${userId}:${notebookId}`;
    const jsonString = JSON.stringify(messages);
    console.log("Storing messages:", { key, jsonString });
    await redis.set(key, jsonString);
    // Set expiration to 24 hours
    await redis.expire(key, 60 * 60 * 24);
  } catch (error) {
    console.error("Error in setChatHistory:", error);
    throw error;
  }
}

export async function getChatHistory(userId: string, notebookId: string) {
  try {
    const redis = getRedisClient();
    if (!redis) {
      // In browser or when Redis is not available, return null
      return null;
    }
    const key = `chat:${userId}:${notebookId}`;
    const history = await redis.get(key);
    console.log("Retrieved history:", { key, history, type: typeof history });

    if (!history) return [];

    if (typeof history === "object") {
      return history;
    }

    try {
      return JSON.parse(history as string);
    } catch (parseError) {
      console.error("Error parsing chat history:", parseError);
      console.error("Raw history:", history);
      return [];
    }
  } catch (error) {
    console.error("Error in getChatHistory:", error);
    return [];
  }
}

export async function clearChatHistory(userId: string, notebookId: string) {
  try {
    const redis = getRedisClient();
    if (!redis) {
      // In browser or when Redis is not available, return success
      return true;
    }
    const key = `chat:${userId}:${notebookId}`;
    await redis.del(key);
  } catch (error) {
    console.error("Error in clearChatHistory:", error);
    throw error;
  }
}

export async function setUserNotebook(
  userId: string,
  notebookId: string,
  notebook: any
) {
  try {
    const redis = getRedisClient();
    if (!redis) {
      // In browser or when Redis is not available, use memory cache
      return null;
    }
    const key = `notebook:${userId}:${notebookId}`;
    const jsonString = JSON.stringify(notebook);
    console.log("Storing notebook:", { key, jsonString });
    await redis.set(key, jsonString);
    // Set expiration to 7 days
    await redis.expire(key, 60 * 60 * 24 * 7);
  } catch (error) {
    console.error("Error in setUserNotebook:", error);
    throw error;
  }
}

export async function getUserNotebook(userId: string, notebookId: string) {
  try {
    const redis = getRedisClient();
    if (!redis) {
      // In browser or when Redis is not available, return null
      return null;
    }
    const key = `notebook:${userId}:${notebookId}`;
    const notebook = await redis.get(key);
    console.log("Retrieved notebook:", {
      key,
      notebook,
      type: typeof notebook,
    });

    if (!notebook) return null;

    if (typeof notebook === "object") {
      return notebook;
    }

    try {
      return JSON.parse(notebook as string);
    } catch (parseError) {
      console.error("Error parsing notebook:", parseError);
      console.error("Raw notebook:", notebook);
      return null;
    }
  } catch (error) {
    console.error("Error in getUserNotebook:", error);
    return null;
  }
}

export async function setAllNotebooks(userId: string, notebooks: any[]) {
  try {
    const redis = getRedisClient();
    if (!redis) {
      // In browser or when Redis is not available, use memory cache
      return null;
    }
    const key = `notebooks:${userId}`;
    const jsonString = JSON.stringify(notebooks);
    console.log("Storing all notebooks:", { key, count: notebooks.length });
    await redis.set(key, jsonString);
    // Set expiration to 24 hours
    await redis.expire(key, 60 * 60 * 24);
  } catch (error) {
    console.error("Error in setAllNotebooks:", error);
    throw error;
  }
}

export async function getAllNotebooks(userId: string) {
  try {
    const redis = getRedisClient();
    if (!redis) {
      // In browser or when Redis is not available, return null
      return null;
    }
    const key = `notebooks:${userId}`;
    const notebooks = await redis.get(key);
    console.log("Retrieved notebooks:", {
      key,
      count: notebooks ? JSON.parse(notebooks as string).length : 0,
    });

    if (!notebooks) return null;

    if (typeof notebooks === "object") {
      return notebooks;
    }

    try {
      return JSON.parse(notebooks as string);
    } catch (parseError) {
      console.error("Error parsing notebooks:", parseError);
      return null;
    }
  } catch (error) {
    console.error("Error in getAllNotebooks:", error);
    return null;
  }
}

/**
 * Set a value in Redis with optional TTL
 */
export async function setCacheValue(key: string, value: any): Promise<boolean | null> {
  const redis = getRedisClient();
  if (!redis) {
    // In browser or when Redis is not available, use memory cache
    return null;
  }

  try {
    await redis.set(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('[REDIS_SET_ERROR]', error);
    return null;
  }
}

/**
 * Get a value from Redis
 */
export async function getCacheValue<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) {
    // In browser or when Redis is not available, return null
    return null;
  }

  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('[REDIS_GET_ERROR]', error);
    return null;
  }
}

/**
 * Delete a value from Redis
 */
export async function deleteCacheValue(key: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    // In browser or when Redis is not available, return success
    return true;
  }

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('[REDIS_DELETE_ERROR]', error);
    return false;
  }
}

/**
 * Cache the result of a function
 */
export async function cacheResult<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      // In browser or when Redis is not available, use memory cache
      return fn();
    }
    const cachedValue = await redis.get(key);
    if (cachedValue !== null) {
      return JSON.parse(cachedValue);
    }

    const result = await fn();
    await setCacheValue(key, result);
    return result;
  } catch (error) {
    console.error("Error in cacheResult:", error);
    return null;
  }
}

/**
 * Rate limiting utility
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  window: number
): Promise<boolean> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      // If Redis is not available, allow the request
      return true;
    }
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, window);
    }
    
    return current <= limit;
  } catch (error) {
    console.error("Error in checkRateLimit:", error);
    // In case of error, allow the request
    return true;
  }
}

/**
 * Lock utility for distributed operations
 */
export async function acquireLock(
  key: string,
  ttl: number = 30000
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    // In browser or when Redis is not available, return success
    return true;
  }

  try {
    // Try to acquire lock with NX (only set if not exists) and PX (millisecond TTL)
    const result = await redis.set(key, 'locked', 'PX', ttl, 'NX');
    return result === 'OK';
  } catch (error) {
    console.error('[REDIS_LOCK_ERROR]', error);
    return false;
  }
}

/**
 * Release a previously acquired lock
 */
export async function releaseLock(key: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    // In browser or when Redis is not available, return success
    return true;
  }

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('[REDIS_UNLOCK_ERROR]', error);
    return false;
  }
}
