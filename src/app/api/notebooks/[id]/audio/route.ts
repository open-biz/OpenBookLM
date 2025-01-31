import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

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

    // Call your Python backend to generate audio
    const response = await fetch("http://localhost:8000/api/generate_audio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notebook_id: params.id,
        conversation: conversation,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || "Failed to generate audio" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[AUDIO_GENERATION]", error);
    return NextResponse.json(
      { error: "Failed to generate audio" },
      { status: 500 }
    );
  }
}
