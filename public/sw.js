// Lettly Service Worker
// SECURITY: Only caches static assets - never caches API responses or user data
const CACHE_NAME = 'lettly-v1'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
]

// Install - cache static assets only
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch strategy:
// - API routes (/api/*): NEVER cache - always network, fail cleanly
// - Auth routes: NEVER cache
// - Static assets: cache first, network fallback
// - Pages: network first, offline fallback
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // SECURITY: Never intercept API calls, auth, or cross-origin requests
  if (url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/sign-in') ||
      url.pathname.startsWith('/sign-up') ||
      url.origin !== self.location.origin) {
    return // Let browser handle normally
  }

  // Static assets - cache first
  if (url.pathname.match(/\.(js|css|png|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    )
    return
  }

  // Pages - network first, offline page fallback
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match('/').then(cached => cached || new Response(
        '<html><body style="font-family:system-ui;padding:40px;text-align:center;background:#f7f5f0"><h2 style="color:#1b5e3b">You are offline</h2><p>Please reconnect to use Lettly. Your data is safe and will sync when you are back online.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      ))
    )
  )
})
