import { redis } from "./redis";

export async function setChatHistory(
  userId: string,
  notebookId: string,
  messages: any[]
) {
  try {
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
