import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Handle multipart form data
    const formData = await req.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return new NextResponse("No files provided", { status: 400 });
    }

    // Process each file
    const sources = await Promise.all(
      files.map(async (file: any) => {
        // Create source record in database
        const source = await prisma.source.create({
          data: {
            type: "PDF",
            title: file.name.replace(/\.[^/.]+$/, ""),
            content: "Processing...", // Indicate processing status in content
            notebookId: params.id,
          },
        });

        // Send to backend for processing
        const backendFormData = new FormData();
        backendFormData.append("file", file);
        backendFormData.append("sourceId", source.id);
        backendFormData.append("notebookId", params.id);
        backendFormData.append("userId", userId);

        try {
          const backendResponse = await fetch(`/python/api/process-pdf`, {
            method: "POST",
            body: backendFormData,
          });

          if (!backendResponse.ok) {
            const errorData = await backendResponse.json();
            throw new Error(errorData.detail || "Failed to process PDF");
          }

          const responseData = await backendResponse.json();
          console.log("[PDF_PROCESSING]", responseData);

          // Update source with processed content
          await prisma.source.update({
            where: { id: source.id },
            data: {
              content: responseData.summary || responseData.extractedText,
            },
          });
        } catch (error) {
          console.error("[PDF_PROCESSING_ERROR]", error);
          await prisma.source.update({
            where: { id: source.id },
            data: {
              content: `Error processing PDF: ${error.message}`,
            },
          });
          // Don't throw here - we want to continue processing other files
        }

        return source;
      })
    );

    return NextResponse.json(sources);
  } catch (error) {
    console.error("[SOURCES_UPLOAD_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// Get sources for a notebook
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const sources = await prisma.source.findMany({
      where: {
        notebookId: params.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(sources);
  } catch (error) {
    console.error("[SOURCES_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
