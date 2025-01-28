import { NextResponse } from "next/server";
import { setCacheValue, getCacheValue } from "@/lib/redis-utils";

// Move Redis check to runtime only
export async function GET() {
  // Skip Redis check during build time
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({
      success: false,
      error: "Redis is not available during build",
      message: "Application will work with reduced functionality"
    }, { status: 503 });
  }

  try {
    // Test setting a value
    await setCacheValue("test-key", { message: "Hello from Redis!" });
    
    // Test getting the value back
    const value = await getCacheValue("test-key");
    
    return NextResponse.json({
      success: true,
      message: "Redis is working correctly",
      value
    });
  } catch (error) {
    console.error("[REDIS_TEST_ERROR]", error);
    return NextResponse.json({
      success: false,
      error: "Redis test failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
