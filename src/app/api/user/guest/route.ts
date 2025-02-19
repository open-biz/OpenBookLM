import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";

export async function POST() {
  try {
    const user = await getOrCreateUser();
    return NextResponse.json(user);
  } catch (error) {
    console.error("Error creating guest user:", error);
    return NextResponse.json(
      { error: "Failed to create guest user" },
      { status: 500 }
    );
  }
}
