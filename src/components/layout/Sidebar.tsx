'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/contexts/I18nContext'
import {
  LayoutDashboard, FileText, Activity,
  ClipboardList, LogOut, CheckSquare, BarChart2,
} from 'lucide-react'

type NavItem = { href: string; label: string; icon: React.ElementType }
type NavCategory = { label: string; items: NavItem[] }

export function Sidebar() {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()
  const { t } = useI18n()
  const role = profile?.role ?? 'RM'

  const RM_NAV: NavCategory[] = [
    {
      label: t.nav.main,
      items: [
        { href: '/dashboard',       label: t.nav.dashboard,      icon: LayoutDashboard },
        { href: '/decision-notes',  label: t.nav.decisionNotes,  icon: FileText },
        { href: '/monitoring',      label: t.nav.monitoring,      icon: Activity },
        { href: '/kpi',             label: t.nav.kpi,             icon: BarChart2 },
      ],
    },
    {
      label: t.nav.laporan,
      items: [{ href: '/audit-trail', label: t.nav.auditTrail, icon: ClipboardList }],
    },
  ]

  const ADK_NAV: NavCategory[] = [
    {
      label: t.nav.verification,
      items: [
        { href: '/verifikasi',     label: t.nav.verifikasi,    icon: CheckSquare },
        { href: '/decision-notes', label: t.nav.historyDN,     icon: FileText },
        { href: '/monitoring',     label: t.nav.monitoring,    icon: Activity },
        { href: '/kpi',            label: t.nav.kpi,           icon: BarChart2 },
      ],
    },
    {
      label: t.nav.laporan,
      items: [{ href: '/audit-trail', label: t.nav.auditTrail, icon: ClipboardList }],
    },
  ]

  const BOH_NAV: NavCategory[] = [
    {
      label: t.nav.main,
      items: [
        { href: '/dashboard',      label: t.nav.dashboard,     icon: LayoutDashboard },
        { href: '/decision-notes', label: t.nav.decisionNotes, icon: FileText },
        { href: '/monitoring',     label: t.nav.monitoring,    icon: Activity },
        { href: '/kpi',            label: t.nav.kpi,           icon: BarChart2 },
      ],
    },
    {
      label: t.nav.team,
      items: [{ href: '/verifikasi', label: t.nav.verifikasi, icon: CheckSquare }],
    },
    {
      label: t.nav.laporan,
      items: [{ href: '/audit-trail', label: t.nav.auditTrail, icon: ClipboardList }],
    },
  ]

  const ADMIN_NAV: NavCategory[] = [
    {
      label: t.nav.main,
      items: [
        { href: '/dashboard',      label: t.nav.dashboard,     icon: LayoutDashboard },
        { href: '/decision-notes', label: t.nav.decisionNotes, icon: FileText },
        { href: '/monitoring',     label: t.nav.monitoring,    icon: Activity },
        { href: '/verifikasi',     label: t.nav.verifikasi,    icon: CheckSquare },
        { href: '/kpi',            label: t.nav.kpi,           icon: BarChart2 },
      ],
    },
    {
      label: t.nav.laporan,
      items: [{ href: '/audit-trail', label: t.nav.auditTrail, icon: ClipboardList }],
    },
  ]

  const NAV_BY_ROLE: Record<string, NavCategory[]> = {
    RM: RM_NAV, ADK: ADK_NAV, BOH: BOH_NAV, MANAGER: BOH_NAV, ADMIN: ADMIN_NAV,
  }

  const categories = NAV_BY_ROLE[role] ?? RM_NAV

  return (
    <aside className="w-[195px] shrink-0 bg-[#001f5b] flex flex-col overflow-y-auto">
      {categories.map((cat) => (
        <div key={cat.label}>
          <div className="px-3.5 pt-3.5 pb-1 text-[8px] font-bold tracking-[1.8px] uppercase text-white/60">
            {cat.label}
          </div>
          {cat.items.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3.5 py-[9px] text-[11px] font-medium transition-all border-r-[3px]',
                  active
                    ? 'text-[#f0b429] bg-[rgba(240,180,41,0.12)] border-r-[#f0b429] font-semibold'
                    : 'text-white/85 border-transparent hover:bg-white/[0.08] hover:text-white'
                )}
              >
                <Icon className="w-[15px] h-[15px] shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      ))}

      <div className="flex-1" />

      {role === 'ADK' && (
        <div className="mx-3.5 mb-3 mt-2 bg-[rgba(204,0,0,0.10)] border border-[rgba(204,0,0,0.20)] rounded-[10px] p-3 text-center">
          <div className="text-[9px] text-white/75">{t.nav.verifikasi}</div>
          <div className="text-2xl font-extrabold text-[#CC0000] leading-none my-1">—</div>
          <div className="text-[8px] text-white/60">
            {t.common.loading.replace('...', '')}
          </div>
        </div>
      )}

      <button
        onClick={() => signOut()}
        className="flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] font-medium text-white/80 hover:text-red-300 hover:bg-red-500/10 transition-colors border-t border-white/[0.06]"
      >
        <LogOut className="w-[15px] h-[15px] shrink-0" />
        <span>{t.common.signOut}</span>
      </button>
    </aside>
  )
}

