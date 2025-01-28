// Temporarily disabled Clerk authentication
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Skip auth for static pages
const publicRoutes = createRouteMatcher([
  '/',
  '/sign-in*',
  '/sign-up*',
  '/_not-found',
  '/api/test-redis*'
]);

// Skip middleware during build time or for public routes
export default function middleware(request: Request) {
  if (process.env.NODE_ENV === 'development' || publicRoutes(request)) {
    return new Response();
  }
  return clerkMiddleware()(request);
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
