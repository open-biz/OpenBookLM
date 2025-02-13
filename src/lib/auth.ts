import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "./db";

export async function getOrCreateUser() {
  // Check for guest session first
  const cookieStore = cookies();
  const guestSessionId = cookieStore.get('guest_session_id')?.value;
  
  if (guestSessionId) {
    // Handle guest user
    let guestUser = await prisma.user.findUnique({
      where: { sessionId: guestSessionId },
    });

    if (!guestUser) {
      guestUser = await prisma.user.create({
        data: {
          sessionId: guestSessionId,
          isGuest: true,
          name: "Guest User",
        },
      });
    }

    return guestUser;
  }

  // Handle Clerk auth for non-guest users
  try {
    const { userId } = await clerkAuth();
    if (!userId) return null;

    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      const clerkUser = await currentUser();
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: clerkUser?.emailAddresses[0]?.emailAddress || "placeholder@example.com",
          name: clerkUser?.firstName || "New User",
          isGuest: false,
        },
      });
    }

    return user;
  } catch (error) {
    // If Clerk auth fails, return null
    return null;
  }
}

export async function auth() {
  const cookieStore = cookies();
  const guestSessionId = cookieStore.get('guest_session_id')?.value;
  
  if (guestSessionId) {
    // Return a guest auth object
    return {
      userId: guestSessionId,
      isGuest: true,
    };
  }

  // Return Clerk auth for non-guest users
  return clerkAuth();
}
