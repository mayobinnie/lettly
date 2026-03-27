import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/blog(.*)',
  '/privacy',
  '/terms',
  '/security',
  '/report(.*)',
  '/sitemap.xml',
  '/api/tenant-report(.*)',
  '/api/save',
  '/api/webhooks(.*)',
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
