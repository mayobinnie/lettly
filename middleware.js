import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/blog(.*)',
  '/privacy',
  '/terms',
  '/security',
  '/resources',
  '/portal(.*)',
  '/sitemap.xml',
  '/api/tenant-report(.*)',
  '/api/webhooks(.*)',
  '/api/newsletter',
  '/api/ping',
  '/api/valuation',
  '/api/legislation-monitor',
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
