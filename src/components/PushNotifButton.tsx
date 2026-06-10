'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function PushNotifButton() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC) {
      setLoading(false)
      return
    }
    setSupported(true)

    navigator.serviceWorker
      .register('/sw.js')
      .then(async (reg) => {
        const existing = await reg.pushManager.getSubscription()
        setSubscribed(!!existing)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function toggle() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready

      if (subscribed) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
        }
        setSubscribed(false)
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          alert('Izin notifikasi ditolak. Aktifkan di pengaturan browser.')
          return
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        })
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        })
        setSubscribed(true)
      }
    } catch (e) {
      console.error('Push toggle error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (!supported) return null

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={subscribed ? 'Matikan notifikasi push' : 'Aktifkan notifikasi push'}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        subscribed
          ? 'bg-[#003087] text-white hover:bg-[#00216b]'
          : 'bg-[#f0f2f7] text-[#374151] hover:bg-[#e5e7eb]'
      }`}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : subscribed ? (
        <Bell size={14} />
      ) : (
        <BellOff size={14} />
      )}
      <span className="hidden sm:inline">{subscribed ? 'Notif ON' : 'Notif OFF'}</span>
    </button>
  )
}
