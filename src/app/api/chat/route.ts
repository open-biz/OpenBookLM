import { getRedisClient } from "@/lib/redis";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import { setChatHistory } from "@/lib/redis-utils";
import { prisma } from "@/lib/db";
import { DEFAULT_MODEL, MODEL_SETTINGS } from "@/lib/ai-config";
import { getOrCreateUser } from "@/lib/auth";
import { CreditManager } from "@/lib/credit-manager";
import { UsageType } from "@prisma/client";

const getClient = () => {
  if (!process.env.CEREBRAS_API_KEY) {
    throw new Error("Missing CEREBRAS_API_KEY environment variable");
  }
  return new Cerebras({
    apiKey: process.env.CEREBRAS_API_KEY,
  });
};

interface ResponseChunk {
  choices?: Array<{
    finish_reason?: string;
    message: {
      content: string;
    };
  }>;
}

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { messages, notebookId, modelId } = body;

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    // Calculate token usage (approximate)
    const totalTokens = messages.reduce((sum, msg) => sum + msg.content.length / 4, 0);
    
    // Check credit availability
    const hasCredits = await CreditManager.checkCredits(
      user.id,
      UsageType.CONTEXT_TOKENS,
      totalTokens
    );

    if (!hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 402 }
      );
    }

    // Save to database first
    const chat = await prisma.chat.create({
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

    // Use credits
    await CreditManager.useCredits(
      user.id,
      UsageType.CONTEXT_TOKENS,
      totalTokens,
      notebookId
    );

    // Then store in Redis
    await setChatHistory(user.id, notebookId, messages);

    const client = getClient();
    console.log('Sending request with messages:', messages);
    const response = await client.chat.completions.create({
      messages: messages.map((msg) => ({
        role: msg.role.toLowerCase(),
        content: msg.content,
      })),
      model: modelId || DEFAULT_MODEL.id,
      ...MODEL_SETTINGS,
    }) as ResponseChunk;

    console.log('Got response:', response);

    if (!response.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from chat completion API');
    }

    // Save the assistant's response to the database
    await prisma.chat.update({
      where: { id: chat.id },
      data: {
        messages: {
          create: {
            role: "ASSISTANT",
            content: response.choices[0].message.content,
          },
        },
      },
    });

    return NextResponse.json(response);
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
