import { getRedisClient } from "@/lib/redis";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const notebookId = url.searchParams.get("notebookId");
    if (!notebookId) {
      return new NextResponse("NotebookId is required", { status: 400 });
    }

    const key = `chat:${userId}:${notebookId}`;
    console.log("Fetching chat history for key:", key);

    // Try Redis first
    const redis = getRedisClient();
    if (redis) {
      const history = await redis.get(key);
      if (history) {
        return NextResponse.json(JSON.parse(history));
      }
    }

    // If not in Redis, get from database
    const chats = await prisma.chat.findMany({
      where: {
        notebookId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 1,
    });

    const messages =
      chats.length > 0
        ? chats[0].messages.map((msg) => ({
            role: msg.role.toLowerCase(),
            content: msg.content,
          }))
        : [];

    // Cache in Redis if available
    if (redis) {
      await redis.set(key, JSON.stringify(messages), "EX", 60 * 60 * 24); // 24 hours
    }

    return NextResponse.json(messages);
  } catch (error) {
    console.error("[CHAT_HISTORY_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
