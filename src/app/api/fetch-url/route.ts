import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    // @ Temp will be calling to morgan to log the url
    const response = await fetch(url);
    const content = await response.text();

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Error fetching URL:", error);
    return NextResponse.json(
      { error: "Failed to fetch URL content" },
      { status: 500 }
    );
  }
}
