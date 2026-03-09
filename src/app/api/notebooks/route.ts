export const dynamic = "force-dynamic";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    const userId = currentUser?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await getOrCreateUser(true);
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
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser(true);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, provider } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
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
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
