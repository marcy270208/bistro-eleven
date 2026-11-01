const CACHE_NAME = 'bistro-eleven-shell-v2'
const SCOPE_URL = new URL('./', self.location.href).pathname
const APP_SHELL = [
  SCOPE_URL,
  `${SCOPE_URL}manifest.webmanifest`,
  `${SCOPE_URL}bistro-icon.svg`,
  `${SCOPE_URL}icons/bistro-192.png`,
  `${SCOPE_URL}icons/bistro-512.png`,
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('bistro-eleven-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone()
      caches.open(CACHE_NAME).then((cache) => cache.put(SCOPE_URL, copy))
      return response
    }).catch(() => caches.match(SCOPE_URL)))
    return
  }

  if (
    url.pathname.endsWith('/manifest.webmanifest') ||
    url.pathname.endsWith('/bistro-icon.svg') ||
    url.pathname.includes('/icons/')
  ) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)))
  }
})
