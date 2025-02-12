import { getRedisClient } from "@/lib/redis";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import { setChatHistory } from "@/lib/redis-utils";
import { prisma } from "@/lib/db";
import { DEFAULT_MODEL, MODEL_SETTINGS } from "@/lib/ai-config";

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
    const { userId } = await auth();
    if (!userId) {
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

    // Save to database first
    const chat = await prisma.chat.create({
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
    console.error('Error in chat completion:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}
