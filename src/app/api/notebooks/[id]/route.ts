import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

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

    const key = `notebook:${userId}:${params.id}`;
    const notebook = await redis.get(key);
    return NextResponse.json(notebook ? JSON.parse(notebook as string) : null);
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
