'use client'

import { useAuth } from '@/hooks/useAuth'
import { Bell, User } from 'lucide-react'
import { NotifPanel } from '@/components/NotifPanel'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface NavbarProps {
  title?: string
}

export function Navbar({ title }: NavbarProps) {
  const { profile } = useAuth()
  const [showNotif, setShowNotif] = useState(false)

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-gray-800 truncate">{title ?? 'BRIMOS'}</h1>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotif((v) => !v)}
            className={cn(
              'relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors',
              showNotif && 'bg-gray-100'
            )}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          {showNotif && (
            <div className="absolute right-0 top-full mt-1 z-50">
              <NotifPanel onClose={() => setShowNotif(false)} />
            </div>
          )}
        </div>

        {/* Profile badge */}
        <div className="flex items-center gap-2 pl-3 border-l">
          <div className="w-8 h-8 bg-[#002D62] rounded-full flex items-center justify-center">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.full_name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-800 leading-none">{profile?.full_name ?? '—'}</p>
            <p className="text-xs text-gray-500">{profile?.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
