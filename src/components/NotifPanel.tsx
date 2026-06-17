'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Bell, X, Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface NotifPanelProps {
  onClose: () => void
  onRead?: (countReduced: number) => void
}

export function NotifPanel({ onClose, onRead }: NotifPanelProps) {
  const supabase = createClient()
  const { user } = useAuth()
  const [items, setItems] = useState<Notification[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    const load = () => {
      supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => setItems(data ?? []))
    }
    load()

    const channel = supabase
      .channel(`notif-panel-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'brimos',
        table: 'notifications',
        filter: `recipient_id=eq.${user.id}`,
      }, () => { load() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, user])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const markRead = async (id: string) => {
    const item = items.find((n) => n.id === id)
    if (!item || item.is_read) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id)
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    onRead?.(1)
  }

  const markAllRead = async () => {
    if (!user) return
    const unreadCount = items.filter((n) => !n.is_read).length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('notifications').update({ is_read: true }).eq('recipient_id', user.id).eq('is_read', false)
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    onRead?.(unreadCount)
  }

  return (
    <div ref={ref} className="w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-gray-600" />
          <span className="font-semibold text-sm">Notifikasi</span>
          {items.filter((n) => !n.is_read).length > 0 && (
            <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">
              {items.filter((n) => !n.is_read).length}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={markAllRead} className="p-1 hover:bg-gray-100 rounded text-gray-500 text-xs flex items-center gap-1">
            <Check className="w-3 h-3" /> Baca semua
          </button>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y">
        {items.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Tidak ada notifikasi</p>
        ) : (
          items.map((n) => (
            n.dn_id ? (
              <Link
                key={n.id}
                href={`/decision-notes/${n.dn_id}`}
                onClick={() => markRead(n.id)}
                className={`block px-4 py-3 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50' : ''}`}
              >
                <p className={`text-sm font-medium ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>{n.subject}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(n.created_at, 'dd MMM yyyy HH:mm')}</p>
              </Link>
            ) : (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50' : ''}`}
              >
                <p className={`text-sm font-medium ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>{n.subject}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(n.created_at, 'dd MMM yyyy HH:mm')}</p>
              </div>
            )
          ))
        )}
      </div>
    </div>
  )
}
