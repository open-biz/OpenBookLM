import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { CreditManager } from "@/lib/credit-manager";
import { UsageType } from "@prisma/client";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to generate audio" },
        { status: 401 }
      );
    }

    // Check if user has access to the notebook
    const notebook = await prisma.notebook.findFirst({
      where: {
        id: params.id,
        OR: [{ userId: user.id }, { sharedWith: { some: { id: user.id } } }],
      },
    });

    if (!notebook) {
      return NextResponse.json(
        { error: "Notebook not found or access denied" },
        { status: 403 }
      );
    }

    // Get the conversation data from the request
    const { conversation } = await req.json();

    // Check credit availability for audio generation
    const hasCredits = await CreditManager.checkCredits(
      user.id,
      UsageType.AUDIO_GENERATION,
      1 // Each generation counts as 1 credit
    );

    if (!hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits for audio generation" },
        { status: 402 }
      );
    }

    // Call your Python backend to generate audio
    const response = await fetch(
      "http://170.187.161.93:8000/api/generate_audio",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notebook_id: params.id,
          conversation: conversation,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to generate audio");
    }

    // Use the credit after successful generation
    await CreditManager.useCredits(
      user.id,
      UsageType.AUDIO_GENERATION,
      1,
      params.id
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error generating audio:", error);
    return NextResponse.json(
      { error: "Failed to generate audio" },
      { status: 500 }
    );
  }
}
