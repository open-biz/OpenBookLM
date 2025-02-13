import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { getOrCreateGuestUser } from "@/lib/guest-utils";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const user = await getOrCreateUser();
    const notebooks = await prisma.notebook.findMany({
      where: {
        userId: user?.id,
      },
      include: {
        chats: true,
        sources: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(notebooks);
  } catch (error) {
    console.error("[NOTEBOOKS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();

    let user;
    if (userId) {
      // Get authenticated user
      user = await prisma.user.findUnique({
        where: { clerkId: userId },
      });
    } else {
      // Get or create guest user
      user = await getOrCreateGuestUser();
    }

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const notebook = await prisma.notebook.create({
      data: {
        title: body.title || "Untitled notebook",
        userId: user.id,
        isPublic: false,
      },
    });

    return NextResponse.json(notebook);
  } catch (error) {
    console.error("[NOTEBOOKS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
