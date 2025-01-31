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
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const notebook = await prisma.notebook.findUnique({
      where: {
        id: params.id,
        isPublic: true,
      },
      include: {
        bookmarkedBy: true,
      },
    });

    if (!notebook) {
      return new NextResponse("Notebook not found", { status: 404 });
    }

    const isBookmarked = notebook.bookmarkedBy.some(
      (bookmarkUser) => bookmarkUser.id === user.id
    );

    if (isBookmarked) {
      await prisma.notebook.update({
        where: { id: params.id },
        data: {
          bookmarkedBy: {
            disconnect: { id: user.id },
          },
        },
      });
    } else {
      await prisma.notebook.update({
        where: { id: params.id },
        data: {
          bookmarkedBy: {
            connect: { id: user.id },
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[BOOKMARK_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
