'use client'

import { useAuth } from '@/hooks/useAuth'
import { Bell } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { NotifPanel } from '@/components/NotifPanel'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/contexts/I18nContext'
import PushNotifButton from '@/components/PushNotifButton'

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  RM:      { bg: '#f0b429', color: '#002470' },
  ADK:     { bg: '#CC0000', color: '#ffffff' },
  BOH:     { bg: '#f0b429', color: '#002470' },
  MANAGER: { bg: '#00897b', color: '#ffffff' },
  ADMIN:   { bg: '#003087', color: '#ffffff' },
}

const ROLE_BADGE_LABEL: Record<string, string> = {
  RM: 'RM', ADK: 'ADK', BOH: 'BOH', MANAGER: 'CBM', ADMIN: 'ADMIN',
}

export function Navbar() {
  const { profile, user } = useAuth()
  const { lang, toggleLang, t } = useI18n()
  const [showNotif, setShowNotif] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch unread notification count and subscribe to real-time changes
  useEffect(() => {
    if (!user) return
    const supabase = createClient()

    const fetchCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)
      setUnreadCount(count ?? 0)
    }

    fetchCount()

    // Subscribe to new notifications in real-time
    const channel = supabase
      .channel(`notif-count-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'brimos', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
        () => { fetchCount() }
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [user])

  const role = profile?.role ?? 'RM'
  const badge = ROLE_BADGE[role] ?? ROLE_BADGE.RM
  const initials = profile?.full_name
    ?.split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') ?? '?'

  return (
    <header className="bg-[#002470] h-12 flex items-center justify-between px-5 shrink-0 z-20 relative">
      {/* Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 select-none">
          <div className="bg-white rounded-md p-0.5 flex items-center justify-center shadow-sm">
            <Image src="/brispot.png" alt="BRISPOT" width={24} height={24} className="rounded" priority />
          </div>
          <span className="text-white font-extrabold text-base tracking-widest">
            BRI<span className="text-[#f0b429]">SPOT</span>
          </span>
        </div>
        <div className="w-px h-4 bg-white/20" />
        <span className="text-white/80 text-[11px] font-medium hidden lg:block">
          {t.nav.brandTagline}
        </span>
      </div>

      {/* Nav links removed — navigation lives in the sidebar to avoid duplication */}

      {/* Right: Lang toggle + Push notif + Bell + User */}
      <div className="flex items-center gap-2.5 shrink-0">

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1 text-white/60 hover:text-white hover:bg-white/10 rounded px-2 py-1 text-[9px] font-bold transition-colors"
          title={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
        >
          <span className="text-[11px] leading-none">{lang === 'id' ? '🇮🇩' : '🇬🇧'}</span>
          <span>{lang === 'id' ? 'ID' : 'EN'}</span>
        </button>

        {/* Push notification toggle */}
        <PushNotifButton />
        <div className="relative">
          <button
            onClick={() => setShowNotif((v) => !v)}
            className="relative p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <Bell className="w-[17px] h-[17px]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-[#CC0000] text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 border border-[#002470]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-full mt-1 z-50">
              <NotifPanel
                onClose={() => setShowNotif(false)}
                onRead={(n) => setUnreadCount((c) => Math.max(0, c - n))}
              />
            </div>
          )}
        </div>

        {/* Avatar */}
        <Link href="/profile" className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-white/10 transition-colors" title="Profil & ganti password">
        <div
          className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden"
          style={{ background: badge.bg, color: badge.color }}
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={initials} className="w-full h-full object-cover" />
          ) : initials}
        </div>

        <div className="hidden sm:block leading-none">
          <p className="text-white text-[11px] font-semibold">{profile?.full_name ?? '—'}</p>
          <p className="text-white/75 text-[9px] mt-0.5">{profile?.branch_name ?? profile?.branch_code ?? ''}</p>
        </div>

        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
          style={{ background: badge.bg, color: badge.color }}
        >
          {ROLE_BADGE_LABEL[role] ?? role}
        </span>
        </Link>
      </div>
    </header>
  )
}
