import { NextResponse, NextRequest } from 'next/server';
import { clerkMiddleware } from "@clerk/nextjs/server";
import { v4 as uuidv4 } from 'uuid';

// Handle guest session middleware
const handleGuestSession = (req: NextRequest) => {
  const sessionId = req.cookies.get('guest_session_id');
  
  // If no session exists, create one
  if (!sessionId) {
    const res = NextResponse.next();
    const newSessionId = uuidv4();
    
    // Set cookie with session ID
    res.cookies.set('guest_session_id', newSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 1 week
    });
    
    return res;
  }

  return NextResponse.next();
};

export default function middleware(req: NextRequest) {
  // First handle guest session
  const guestResponse = handleGuestSession(req);
  if (guestResponse) return guestResponse;

  // For non-guest sessions, apply Clerk middleware
  // This will protect all routes except those handled by guest session
  return clerkMiddleware();
}

// Define public routes separately
const publicRoutes = [
  '/',
  '/api/guest/(.*)',
  '/notebooks/(.*)',
];

// Update config to include public routes
export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
    ...publicRoutes
  ],
};
