import { getOrCreateUser } from "@/lib/auth";
import { CreditManager } from "@/lib/credit-manager";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const usageSummary = await CreditManager.getUsageSummary(user.id);
    return NextResponse.json(usageSummary);
  } catch (error) {
    console.error("Error fetching credit usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch credit usage" },
      { status: 500 }
    );
  }
}
