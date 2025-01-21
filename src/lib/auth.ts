import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";

export async function getOrCreateUser() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    const clerkUser = await currentUser();
    user = await prisma.user.create({
      data: {
        clerkId: userId,
        email:
          clerkUser?.emailAddresses[0]?.emailAddress ||
          "placeholder@example.com",
        name: clerkUser?.firstName || "New User",
      },
    });
  }

  return user;
}
