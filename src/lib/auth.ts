import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";
import { CreditManager } from "./credit-manager";
import { nanoid } from "nanoid";

export async function getOrCreateUser() {
  const { userId } = await auth();
  
  // Handle authenticated users
  if (userId) {
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
  }

  // Handle guest users
  const guestId = nanoid();
  const guestUser = await prisma.user.create({
    data: {
      email: `guest_${guestId}@openbooklm.com`,
      name: "Guest User",
      isGuest: true,
    },
  });

  // Initialize guest credits
  await CreditManager.initializeGuestCredits(guestUser.id);

  return guestUser;
}

export async function getCurrentUser() {
  const { userId } = await auth();
  
  if (userId) {
    return prisma.user.findUnique({
      where: { clerkId: userId },
    });
  }
  
  return null;
}
