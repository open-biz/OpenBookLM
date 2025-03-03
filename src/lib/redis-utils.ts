"use server";

import { getRedisClient } from "./redis";

// Cache TTL in seconds (e.g., 1 hour)
const DEFAULT_TTL = 3600;

/**
 * Set a value in Redis with optional TTL
 */
export async function setCacheValue(
  key: string,
  value: any,
  ttl = DEFAULT_TTL
) {
  const redis = getRedisClient();
  if (!redis) return;

  const serializedValue = JSON.stringify(value);
  await redis.setex(key, ttl, serializedValue);
}

/**
 * Get a value from Redis
 */
export async function getCacheValue<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  const value = await redis.get(key);
  if (!value) return null;
  return JSON.parse(value) as T;
}

/**
 * Delete a value from Redis
 */
export async function deleteCacheValue(key: string) {
  const redis = getRedisClient();
  if (!redis) return;

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
  const redis = getRedisClient();
  if (!redis) {
    // If Redis is not available, just execute the function
    return fn();
  }

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
}

/**
 * Lock utility for distributed operations
 */
export async function acquireLock(key: string, ttl = 30): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    // If Redis is not available, assume lock is acquired
    return true;
  }

  // Use SET NX (only set if not exists) with expiry
  const result = await redis.set(`lock:${key}`, Date.now(), "EX", ttl, "NX");
  return result === "OK";
}

/**
 * Release a previously acquired lock
 */
export async function releaseLock(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  await redis.del(`lock:${key}`);
}

export async function setChatHistory(
  userId: string,
  notebookId: string,
  messages: any[]
) {
  const redis = getRedisClient();
  if (!redis) return null;

  const key = `chat:${userId}:${notebookId}`;
  await redis.set(key, JSON.stringify({ messages }));
  await redis.expire(key, 60 * 60 * 24 * 7); // 7 days
}

export async function getChatHistory(userId: string, notebookId: string) {
  const redis = getRedisClient();
  if (!redis) return null;

  const key = `chat:${userId}:${notebookId}`;
  const history = await redis.get(key);
  return history ? JSON.parse(history) : { messages: [] };
}

export async function clearChatHistory(userId: string, notebookId: string) {
  try {
    const redis = getRedisClient();
    if (!redis) return;
    const key = `chat:${userId}:${notebookId}`;
    await redis.del(key);
  } catch (error) {
    console.error("Error in clearChatHistory:", error);
    throw error;
  }
}

export async function setSources(
  userId: string,
  notebookId: string,
  sources: any[]
) {
  try {
    const redis = getRedisClient();
    if (!redis) return;
    const key = `sources:${userId}:${notebookId}`;
    const jsonString = JSON.stringify(sources);
    console.log("Storing sources:", { key, count: sources.length });
    await redis.set(key, jsonString);
    await redis.expire(key, 60 * 60 * 24 * 7); // 7 days expiration
  } catch (error) {
    console.error("Error in setSources:", error);
    // Don't throw, just log the error to prevent UI crashes
  }
}

export async function getSources(userId: string, notebookId: string) {
  try {
    const redis = getRedisClient();
    if (!redis) return;
    const key = `sources:${userId}:${notebookId}`;
    const sources = await redis.get(key);
    console.log("Retrieved sources:", { key, type: typeof sources });

    if (!sources) return [];

    if (typeof sources === "object") {
      return sources;
    }

    try {
      return JSON.parse(sources as string);
    } catch (parseError) {
      console.error("Error parsing sources:", parseError);
      console.error("Raw sources:", sources);
      return [];
    }
  } catch (error) {
    console.error("Error in getSources:", error);
    return [];
  }
}

export async function setUserNotebook(
  userId: string,
  notebookId: string,
  notebook: any
) {
  try {
    const redis = getRedisClient();
    if (!redis) return;
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
    if (!redis) return;
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
    if (!redis) return;
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
    if (!redis) return;
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
  } catch (error) {
    console.error("Error in getAllNotebooks:", error);

    return null;
  }
}

/**
 * Delete all Redis keys related to a notebook
 */
export async function deleteNotebookFromRedis(userId: string, notebookId: string) {
  const redis = getRedisClient();
  if (!redis) return;

  const keys = [
    `notebook:${userId}:${notebookId}`,
    `notebooks:${userId}`,
    `sources:${userId}:${notebookId}`,
    `chat:${userId}:${notebookId}`
  ];

  await Promise.all([
    ...keys.map(key => redis.del(key)),
    // Also remove from the all notebooks cache
    getAllNotebooks(userId).then(notebooks => {
      if (notebooks) {
        const filtered = notebooks.filter(n => n.id !== notebookId);
        return setAllNotebooks(userId, filtered);
      }
    })
  ]);
}

export async function checkRedisConnection() {
  try {
    const redis = getRedisClient();
    if (!redis) return false;
    await redis.ping();
    return true;
  } catch (error) {
    console.error("Redis connection check failed:", error);
    return false;
  }
}
