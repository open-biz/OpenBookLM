import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { notebookId: string } }
) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!params.notebookId) {
      return new NextResponse("Notebook ID is required", { status: 400 });
    }

    // Find or create chat session
    const chat = await prisma.chat.create({
      data: {
        notebookId: params.notebookId,
        messages: {
          create: messages.map((msg: any) => ({
            role: msg.role.toUpperCase(), // Keep uppercase for database storage
            content: msg.content,
          })),
        },
      },
      include: {
        messages: true,
      },
    });

    // Call Cerebras API
    try {
      if (!process.env.CEREBRAS_API_KEY) {
        throw new Error('Missing CEREBRAS_API_KEY environment variable');
      }

      const response = await fetch('YOUR_CEREBRAS_API_ENDPOINT', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
        },
        body: JSON.stringify({
          messages: messages.map((msg: any) => ({
            role: msg.role.toLowerCase(), // Convert to lowercase for API call
            content: msg.content,
          })),
        }),
      });

      const aiResponse = await response.json();

      // Save AI response
      if (aiResponse.choices && aiResponse.choices[0]?.message) {
        await prisma.message.create({
          data: {
            chatId: chat.id,
            role: aiResponse.choices[0].message.role.toUpperCase(),
            content: aiResponse.choices[0].message.content,
          },
        });
      }
    } catch (error) {
      console.error("[CHAT_API_ERROR]", error);
      // Still return the chat even if API call fails
      return NextResponse.json(chat);
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error("[CHAT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
