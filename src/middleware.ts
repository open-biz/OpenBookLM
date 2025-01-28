// Temporarily disabled Clerk authentication
import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, NextRequest } from 'next/server';

// Skip Clerk authentication if key not set
export default function middleware(req: NextRequest, evt: any) {
  if (!process.env.CLERK_SECRET_KEY) {
    return NextResponse.next();
  }
  return clerkMiddleware()(req, evt);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
