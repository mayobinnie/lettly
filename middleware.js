import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/blog(.*)',
  '/privacy',
  '/terms',
  '/security',
  '/resources',
  '/portal(.*)',
  '/sitemap.xml',
  '/api/tenant-report(.*)',
  '/api/webhooks(.*)',
  '/api/stripe/webhook',
  '/api/newsletter',
  '/api/ping',
  '/api/valuation',
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
