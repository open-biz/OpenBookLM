import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define protected routes using createRouteMatcher
const protectedRoutes = createRouteMatcher([
  '/api/chat(.*)',
  '/api/notebooks(.*)',
  '/api/credits(.*)',
  '/api/user(.*)',
]);

// Define public paths that don't require authentication
const publicPaths = [
  "/",
  "/sign-in*",
  "/sign-up*",
  "/api/webhooks*",
  "/api/trpc*",
];

const isPublic = (path: string) => {
  return publicPaths.find((x) =>
    path.match(new RegExp(`^${x}$`.replace("*$", "($|/)")))
  );
};

export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname;

  if (isPublic(path)) {
    return NextResponse.next();
  }

  if (protectedRoutes(req)) {
    await auth.protect();
  }

  return NextResponse.next();
});

// Stop Middleware running on static files
export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
