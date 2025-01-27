import { NextResponse } from "next/server";
import { setCacheValue, getCacheValue } from "@/lib/redis-utils";

export async function GET() {
  try {
    // Test setting a value
    await setCacheValue("test-key", { message: "Hello from Redis!" });
    
    // Test getting the value back
    const value = await getCacheValue("test-key");
    
    return NextResponse.json({
      success: true,
      value,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[REDIS_TEST_ERROR]", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
