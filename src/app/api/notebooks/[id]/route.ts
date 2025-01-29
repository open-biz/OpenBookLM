import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";
import { prisma } from "@/lib/db";
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const redis = getRedisClient();
    if (!redis) {
      return new NextResponse("Redis connection failed", { status: 500 });
    }
    try {
      const notebook = await prisma.notebook.findUnique({
        where: {
          id: params.id,
        },
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          sources: {
            select: {
              content: true,
            },
          },
        },
      });
      console.log("NOTEBOOK", notebook);
      return NextResponse.json(notebook);
    } catch (error) {
      console.error("[NOTEBOOK_GET]", error);
      return new NextResponse("Internal Error", { status: 500 });
    }

    // const notebook = await redis.get(key);
  } catch (error) {
    console.error("[NOTEBOOK_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const redis = getRedisClient();
    if (!redis) {
      return new NextResponse("Redis connection failed", { status: 500 });
    }

    const notebook = await req.json();
    const key = `notebook:${userId}:${params.id}`;
    await redis.set(key, JSON.stringify(notebook));
    await redis.expire(key, 60 * 60 * 24 * 7); // 7 days

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[NOTEBOOK_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
