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
    const user = await getOrCreateUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { title, provider } = body;

    if (!title) {
      return new NextResponse("Title is required", { status: 400 });
    }

    const notebook = await prisma.notebook.create({
      data: {
        title,
        userId: user?.id,
        content: "",
        provider: provider || "groq", // Default to groq if not specified
      },
    });

    return NextResponse.json(notebook);
  } catch (error) {
    console.error("[NOTEBOOKS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
