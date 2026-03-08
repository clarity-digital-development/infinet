import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/chat(.*)', '/dashboard(.*)', '/admin(.*)'])
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/share(.*)',
  '/pricing',
  '/api/webhook(.*)',
  '/api/test-db',
])

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionId } = await auth()

  // If user is authenticated, redirect landing/auth pages to chat
  if (userId && sessionId) {
    if (req.nextUrl.pathname === '/' || req.nextUrl.pathname.startsWith('/sign-in') || req.nextUrl.pathname.startsWith('/sign-up')) {
      const url = req.nextUrl.clone()
      url.pathname = '/chat'
      return NextResponse.redirect(url)
    }
  }

  // Protect routes that require authentication
  if (!isPublicRoute(req)) {
    if (!userId || !sessionId) {
      await auth.protect()
    }

    // If user is authenticated but on /chat, check for subscription
    if (isProtectedRoute(req) && userId) {
      // Don't check subscription on API routes (they handle it internally)
      if (!req.nextUrl.pathname.startsWith('/api')) {
        // This check would happen client-side for better UX
        // The actual subscription check is done in API routes
        return NextResponse.next()
      }
    }
  }

  // Allow public routes
  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}