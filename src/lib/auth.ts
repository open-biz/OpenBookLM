import { betterAuth } from "better-auth";
import { escapeHtml, sendTransactionalEmail } from "./cloudflare-email";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins";
import { prisma } from "./db";
import { CreditManager } from "./credit-manager";
import { nanoid } from "nanoid";
import { headers, cookies } from "next/headers";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "this-is-a-very-long-secret-key-for-better-auth-to-use-during-build",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
    google: {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 5,
      sendMagicLink: async ({ email, url }) => {
        await sendTransactionalEmail({
          to: email,
          subject: "Sign in to OpenBookLM",
          text: `Sign in to OpenBookLM: ${url}\n\nThis link expires in 5 minutes and can only be used once. If you did not request it, ignore this email.`,
          html: `<h2>Sign in to OpenBookLM</h2><p><a href="${escapeHtml(url)}">Sign in to OpenBookLM</a></p><p>This link expires in 5 minutes and can only be used once. If you did not request it, ignore this email.</p>`,
        });
      },
    }),
  ],
});

export async function getOrCreateUser(shouldSetCookie = false) {
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
  const cookieStore = await cookies();
  const existingGuestId = cookieStore.get("openbooklm_guest_id")?.value;

  if (existingGuestId) {
    const guestUser = await prisma.user.findUnique({
      where: { id: existingGuestId },
    });
    // A guest cookie is an unsigned identifier, never an authenticated account credential.
    if (guestUser?.isGuest === true) {
      return guestUser;
    }
  }

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

  // Set the guest cookie to persist the session if requested (safe in Route Handlers/Server Actions)
  if (shouldSetCookie) {
    cookieStore.set("openbooklm_guest_id", guestUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
  }

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

  const cookieStore = await cookies();
  const existingGuestId = cookieStore.get("openbooklm_guest_id")?.value;

  if (existingGuestId) {
    const guestUser = await prisma.user.findUnique({
      where: { id: existingGuestId },
    });
    return guestUser?.isGuest === true ? guestUser : null;
  }
  
  return null;
}
