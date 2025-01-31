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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Verify notebook belongs to user
    const notebook = await prisma.notebook.findUnique({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!notebook) {
      return NextResponse.json(
        { error: "Notebook not found or not authorized" },
        { status: 404 }
      );
    }

    // Find user to share with by exact email match
    const shareWithUser = await prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
    });

    if (!shareWithUser) {
      return NextResponse.json(
        { error: "User not found with that email" },
        { status: 404 }
      );
    }

    // Share notebook (read-only)
    await prisma.notebook.update({
      where: {
        id: params.id,
      },
      data: {
        sharedWith: {
          connect: {
            id: shareWithUser.id,
          },
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SHARE_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { email } = await req.json();

    if (!email) {
      return new NextResponse("Email is required", { status: 400 });
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

    // Find user to unshare with
    const unshareWithUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!unshareWithUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Unshare notebook
    await prisma.notebook.update({
      where: {
        id: params.id,
      },
      data: {
        sharedWith: {
          disconnect: {
            id: unshareWithUser.id,
          },
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SHARE_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
