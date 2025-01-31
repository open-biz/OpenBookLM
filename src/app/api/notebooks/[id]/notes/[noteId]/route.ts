import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { title, content } = await req.json();

    if (!title || !content) {
      return new NextResponse("Title and content are required", {
        status: 400,
      });
    }

    // Verify notebook belongs to user
    const notebook = await prisma.notebook.findUnique({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!notebook) {
      return new NextResponse("Notebook not found", { status: 404 });
    }

    const note = await prisma.note.update({
      where: {
        id: params.noteId,
        notebookId: params.id,
      },
      data: {
        title,
        content,
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error("[NOTE_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
