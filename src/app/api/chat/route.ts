import { getRedisClient } from "@/lib/redis";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import { setChatHistory } from "@/lib/redis-utils";
import { prisma } from "@/lib/db";

const getClient = () => {
  if (!process.env.CEREBRAS_API_KEY) {
    throw new Error("Missing CEREBRAS_API_KEY environment variable");
  }
  return new Cerebras({
    apiKey: process.env.CEREBRAS_API_KEY,
  });
};

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { messages, notebookId } = body;

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    // Get the source content from the notebook
    const notebook = await prisma.notebook.findUnique({
      where: { id: notebookId },
      include: { sources: true },
    });

    // Prepare the context with source content first
    const sourceContexts = notebook?.sources?.map(source => ({
      role: "system",
      content: `Source: ${source.title}\n\n${source.content}`,
    })) || [];

    // Calculate remaining space for chat messages
    const MAX_CHARS = 6000;
    const sourceChars = sourceContexts.reduce((acc, src) => acc + src.content.length, 0);
    const remainingChars = MAX_CHARS - sourceChars;

    // Get the last message (current user query)
    const lastMessage = messages[messages.length - 1];

    // Prepare truncated chat history
    const chatHistory = [];
    let currentChars = lastMessage.content.length;

    // Add messages from newest to oldest until we hit the limit
    for (let i = messages.length - 2; i >= 0 && currentChars < remainingChars; i--) {
      const msg = messages[i];
      if (currentChars + msg.content.length <= remainingChars) {
        chatHistory.unshift(msg);
        currentChars += msg.content.length;
      } else {
        break;
      }
    }

    // Combine sources and chat history
    const finalMessages = [
      ...sourceContexts,
      ...chatHistory,
      lastMessage
    ];

    // Save to database
    await prisma.chat.create({
      data: {
        notebookId,
        messages: {
          create: messages.map((msg) => ({
            role: msg.role.toUpperCase(),
            content: msg.content,
          })),
        },
      },
    });

    // Store in Redis
    await setChatHistory(userId, notebookId, messages);

    const client = getClient();
    const completionResponse = await client.chat.completions.create({
      messages: finalMessages,
      model: "llama3.3-70b",
      temperature: 0.7,
      max_tokens: 1000,
    });

    return NextResponse.json(completionResponse);
  } catch (error) {
    console.error("[CHAT_ERROR]", error);
    if (error.error?.code === "context_length_exceeded") {
      return NextResponse.json(
        { error: "Message history too long. Some older messages have been truncated." },
        { status: 400 }
      );
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}
