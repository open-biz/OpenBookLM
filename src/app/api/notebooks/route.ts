import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const notebooks = await prisma.notebook.findMany({
      where: {
        userId: userId,
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
    const user = await getOrCreateUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { title } = body;

    if (!title) {
      return new NextResponse("Title is required", { status: 400 });
    }

    const notebook = await prisma.notebook.create({
      data: {
        title,
        // TODO: Remove this temporary userId once auth is re-enabled
        userId: "temp_user_id", // Temporary user ID for development
      },
    });

    return NextResponse.json(notebook);
  } catch (error) {
    console.error("[NOTEBOOKS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
