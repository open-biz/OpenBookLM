import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";

export async function getOrCreateUser() {
  // Handle development mode
  if (process.env.NODE_ENV === 'development') {
    let user = await prisma.user.findUnique({
      where: { clerkId: 'dev-user' },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: 'dev-user',
          email: 'dev@example.com',
          name: 'Development User',
        },
      });
    }

    return user;
  }

  // Production mode with Clerk auth
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
        email: clerkUser?.emailAddresses[0]?.emailAddress || "placeholder@example.com",
        name: clerkUser?.firstName || "Anonymous",
      },
    });
  }

  return user;
}
