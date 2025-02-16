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

    // Save to database first
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

    // Then store in Redis
    await setChatHistory(userId, notebookId, messages);

    const client = getClient();
    const completionResponse = await client.chat.completions.create({
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      model: "llama3.3-70b",
      temperature: 0.7,
      max_tokens: 1000,
    });

    return NextResponse.json(completionResponse);
  } catch (error) {
    console.error("[CHAT_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
