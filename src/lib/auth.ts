import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";
import { CreditManager } from "./credit-manager";
import { nanoid } from "nanoid";
import { headers } from "next/headers";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "this-is-a-very-long-secret-key-for-better-auth-to-use-during-build",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
});

export async function getOrCreateUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  // Handle authenticated users
  if (session?.user) {
    return prisma.user.findUnique({
      where: { id: session.user.id },
    });
  }

  // Handle guest users
  const guestId = nanoid();
  const guestUser = await prisma.user.create({
    data: {
      email: `guest_${guestId}@openbooklm.com`,
      name: "Guest User",
      isGuest: true,
      emailVerified: true,
    },
  });

  // Initialize guest credits
  await CreditManager.initializeGuestCredits(guestUser.id);

  return guestUser;
}

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (session?.user) {
    return prisma.user.findUnique({
      where: { id: session.user.id },
    });
  }
  
  return null;
}
