import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function getOrCreateGuestUser() {
  const cookieStore = cookies();
  const sessionId = cookieStore.get('guest_session_id')?.value;

  if (!sessionId) {
    return null;
  }

  // Try to find existing guest user
  let guestUser = await prisma.user.findUnique({
    where: { sessionId },
  });

  // If guest user doesn't exist, create one
  if (!guestUser) {
    guestUser = await prisma.user.create({
      data: {
        sessionId,
        isGuest: true,
        name: `Guest ${sessionId.slice(0, 6)}`,
      },
    });
  }

  return guestUser;
}

export async function isGuestSession() {
  const cookieStore = cookies();
  const sessionId = cookieStore.get('guest_session_id')?.value;
  return !!sessionId;
}

export async function getCurrentUser() {
  const isGuest = await isGuestSession();
  
  if (isGuest) {
    return getOrCreateGuestUser();
  }
  
  // For non-guest users, return null and let Clerk handle auth
  return null;
}
