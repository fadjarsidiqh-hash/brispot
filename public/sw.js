// BRIMOS Service Worker - Push Notifications

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {}
  const title = data.title || 'BRIMOS'
  const options = {
    body: data.body || '',
    icon: '/icons/192.png',
    badge: '/icons/192.png',
    data: { url: data.url || '/dashboard' },
    requireInteraction: false,
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data?.url || '/dashboard'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url))
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})
