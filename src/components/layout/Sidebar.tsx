'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard, FileText, CheckSquare, BarChart2,
  ClipboardList, Activity, ChevronLeft, ChevronRight, LogOut, ShieldCheck
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['AO','DK','BOH','ADMIN'] },
  { href: '/decision-notes', label: 'Decision Notes', icon: FileText, roles: ['AO','DK','BOH','ADMIN'] },
  { href: '/verifikasi', label: 'Verifikasi', icon: CheckSquare, roles: ['DK','BOH','ADMIN'] },
  { href: '/monitoring', label: 'Monitoring', icon: Activity, roles: ['DK','BOH','ADMIN'] },
  { href: '/kpi', label: 'KPI & Target', icon: BarChart2, roles: ['BOH','ADMIN'] },
  { href: '/audit-trail', label: 'Audit Trail', icon: ClipboardList, roles: ['ADMIN'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const role = profile?.role ?? 'AO'
  const visible = navItems.filter((n) => n.roles.includes(role))

  return (
    <aside
      className={cn(
        'flex flex-col bg-[#002D62] text-white transition-all duration-300 min-h-screen',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-white/10">
        <ShieldCheck className="shrink-0 w-7 h-7 text-[#F5A623]" />
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight">BRIMOS</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {visible.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-white/10 space-y-1">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white text-sm transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : (
            <><ChevronLeft className="w-5 h-5" /><span>Collapse</span></>
          )}
        </button>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-white/70 hover:bg-red-500/20 hover:text-red-300 text-sm transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>
    </aside>
  )
}
