export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";

export async function POST() {
  try {
    // Pass true to shouldSetCookie since we are in a Route Handler
    const user = await getOrCreateUser(true);
    return NextResponse.json(user);
  } catch (error) {
    console.error("Error creating guest user:", error);
    return NextResponse.json(
      { error: "Failed to create guest user" },
      { status: 500 }
    );
  }
}
