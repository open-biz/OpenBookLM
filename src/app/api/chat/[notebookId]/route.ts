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
            role: msg.role.toUpperCase(),
            content: msg.content,
          })),
        },
      },
      include: {
        messages: true,
      },
    });

    // Call Cerebras API
    const response = await fetch('YOUR_CEREBRAS_API_ENDPOINT', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
      },
      body: JSON.stringify({
        messages: messages,
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

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error("[CHAT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
