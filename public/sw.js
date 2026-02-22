const CACHE_NAME = 'quran-app-v1'
const AUDIO_CACHE = 'quran-audio-v1'

// App shell files to cache
const APP_SHELL = [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.json',
    '/icon.svg',
]

// Install — cache app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(APP_SHELL)
        })
    )
    self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME && key !== AUDIO_CACHE)
                    .map((key) => caches.delete(key))
            )
        })
    )
    self.clients.claim()
})

// Fetch strategy
self.addEventListener('fetch', (event) => {
    // 1. Only handle GET requests (cache.put throws on POST/PUT)
    if (event.request.method !== 'GET') return

    // 2. Only handle HTTP/HTTPS (ignore chrome-extension://, wss://, etc)
    if (!event.request.url.startsWith('http')) return

    const url = new URL(event.request.url)

    // 3. Bypass caching completely for Supabase DB requests and local Dev Server HMR
    if (url.hostname.includes('supabase.co') || url.pathname.includes('/@vite/')) {
        return
    }

    // Audio files — cache first, then network
    if (
        url.hostname.includes('mp3quran.net') ||
        url.hostname.includes('everyayah.com') ||
        url.hostname.includes('github.io') ||
        url.hostname.includes('githubusercontent.com') ||
        url.pathname.endsWith('.mp3')
    ) {
        event.respondWith(
            caches.open(AUDIO_CACHE).then((cache) => {
                return cache.match(event.request).then((cached) => {
                    if (cached) return cached

                    return fetch(event.request)
                        .then((response) => {
                            if (response.ok) {
                                cache.put(event.request, response.clone())
                            }
                            return response
                        })
                        .catch(() => {
                            return new Response('Audio unavailable offline', {
                                status: 503,
                                statusText: 'Service Unavailable',
                            })
                        })
                })
            })
        )
        return
    }

    // API requests — network first, stale cache fallback
    if (url.hostname === 'quranapi.pages.dev') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clone = response.clone()
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone)
                    })
                    return response
                })
                .catch(() => {
                    return caches.match(event.request).then((cached) => {
                        return cached || new Response(JSON.stringify({ error: 'Offline' }), {
                            headers: { 'Content-Type': 'application/json' },
                            status: 503,
                        })
                    })
                })
        )
        return
    }

    // App pages — network first, fallback to cache, then offline page
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(event.request).then((cached) => {
                        return cached || caches.match('/offline.html')
                    })
                })
        )
        return
    }

    // Static assets — stale-while-revalidate
    event.respondWith(
        caches.match(event.request).then((cached) => {
            const networkFetch = fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const responseToCache = response.clone()
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache)
                        })
                    }
                    return response
                })
                .catch(() => cached)

            return cached || networkFetch
        })
    )
})
