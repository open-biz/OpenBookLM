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
        { error: "Please sign in to add sources" },
        { status: 401 }
      );
    }

    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Create source record in database
    const source = await prisma.source.create({
      data: {
        type: "URL",
        title: url,
        content: "Processing...", // Indicate processing status
        notebookId: params.id,
      },
    });

    // Send to backend for processing
    const backendResponse = await fetch(`${process.env.BACKEND_URL}/website`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        sourceId: source.id,
        notebookId: params.id,
        userId: user.id,
      }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      throw new Error(errorData.detail || "Failed to process website");
    }

    const responseData = await backendResponse.json();

    // Update source with processed content
    await prisma.source.update({
      where: { id: source.id },
      data: {
        content: responseData.summary || responseData.extractedText,
      },
    });

    return NextResponse.json({ success: true, source });
  } catch (error) {
    console.error("[WEBSITE_PROCESSING_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to process website" },
      { status: 500 }
    );
  }
}
