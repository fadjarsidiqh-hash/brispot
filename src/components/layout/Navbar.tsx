'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Bell } from 'lucide-react'
import { NotifPanel } from '@/components/NotifPanel'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/decision-notes', label: 'Decision Notes' },
  { href: '/monitoring', label: 'Monitoring' },
  { href: '/kpi', label: 'KPI' },
  { href: '/audit-trail', label: 'Laporan' },
]

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  AO:    { bg: '#f0b429', color: '#002470' },
  DK:    { bg: '#CC0000', color: '#ffffff' },
  BOH:   { bg: '#f0b429', color: '#002470' },
  ADMIN: { bg: '#003087', color: '#ffffff' },
}

export function Navbar() {
  const pathname = usePathname()
  const { profile, user } = useAuth()
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
        { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
        () => { fetchCount() }
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [user])

  const role = profile?.role ?? 'AO'
  const badge = ROLE_BADGE[role] ?? ROLE_BADGE.AO
  const initials = profile?.full_name
    ?.split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') ?? '?'

  return (
    <header className="bg-[#002470] h-12 flex items-center justify-between px-5 shrink-0 z-20 relative">
      {/* Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-white font-extrabold text-base tracking-widest select-none">
          BRI<span className="text-[#f0b429]">MOS</span>
        </span>
        <div className="w-px h-4 bg-white/20" />
        <span className="text-white/50 text-[11px] font-medium hidden lg:block">
          BRI Monitoring &amp; Oversight System
        </span>
      </div>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-6 h-full">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + '/')
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-[11px] font-medium h-full flex items-center border-b-2 transition-colors',
                active
                  ? 'text-[#f0b429] border-[#f0b429] font-semibold'
                  : 'text-white/55 border-transparent hover:text-white/85 hover:border-white/20'
              )}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Right: Bell + User */}
      <div className="flex items-center gap-2.5 shrink-0">
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
          <p className="text-white/45 text-[9px] mt-0.5">{profile?.branch_name ?? profile?.branch_code ?? ''}</p>
        </div>

        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
          style={{ background: badge.bg, color: badge.color }}
        >
          {role}
        </span>
      </div>
    </header>
  )
}
