'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard, FileText, Activity, Target, Upload,
  ClipboardList, Settings, LogOut, CheckSquare, ShieldCheck,
} from 'lucide-react'

type NavItem = { href: string; label: string; icon: React.ElementType }
type NavCategory = { label: string; items: NavItem[] }

const AO_NAV: NavCategory[] = [
  {
    label: 'Utama',
    items: [
      { href: '/dashboard',       label: 'Dashboard',       icon: LayoutDashboard },
      { href: '/decision-notes',  label: 'Decision Notes',  icon: FileText },
      { href: '/monitoring',      label: 'Monitoring',      icon: Activity },
      { href: '/kpi',             label: 'KPI Saya',        icon: Target },
    ],
  },
  {
    label: 'Laporan',
    items: [
      { href: '/audit-trail', label: 'Audit Trail', icon: ClipboardList },
    ],
  },
  {
    label: 'Akun',
    items: [
      { href: '/settings', label: 'Pengaturan', icon: Settings },
    ],
  },
]

const DK_NAV: NavCategory[] = [
  {
    label: 'Verifikasi',
    items: [
      { href: '/verifikasi',  label: 'Antrian Verifikasi', icon: CheckSquare },
      { href: '/monitoring',  label: 'Monitoring',         icon: Activity },
    ],
  },
  {
    label: 'Laporan',
    items: [
      { href: '/audit-trail', label: 'Audit Trail', icon: ClipboardList },
    ],
  },
  {
    label: 'Akun',
    items: [
      { href: '/settings', label: 'Pengaturan', icon: Settings },
    ],
  },
]

const BOH_NAV: NavCategory[] = [
  {
    label: 'Utama',
    items: [
      { href: '/dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
      { href: '/decision-notes', label: 'Decision Notes', icon: FileText },
      { href: '/monitoring',     label: 'Monitoring',     icon: Activity },
      { href: '/kpi',            label: 'KPI & Setting',  icon: Target },
    ],
  },
  {
    label: 'Tim',
    items: [
      { href: '/verifikasi', label: 'Verifikasi', icon: CheckSquare },
    ],
  },
  {
    label: 'Laporan',
    items: [
      { href: '/audit-trail', label: 'Audit Trail', icon: ClipboardList },
    ],
  },
]

const ADMIN_NAV: NavCategory[] = [
  {
    label: 'Utama',
    items: [
      { href: '/dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
      { href: '/decision-notes', label: 'Decision Notes', icon: FileText },
      { href: '/monitoring',     label: 'Monitoring',     icon: Activity },
      { href: '/kpi',            label: 'KPI & Setting',  icon: Target },
      { href: '/verifikasi',     label: 'Verifikasi',     icon: CheckSquare },
    ],
  },
  {
    label: 'Laporan',
    items: [
      { href: '/audit-trail', label: 'Audit Trail', icon: ClipboardList },
    ],
  },
  {
    label: 'Akun',
    items: [
      { href: '/settings', label: 'Pengaturan', icon: Settings },
    ],
  },
]

const NAV_BY_ROLE: Record<string, NavCategory[]> = {
  AO: AO_NAV, DK: DK_NAV, BOH: BOH_NAV, ADMIN: ADMIN_NAV,
}

export function Sidebar() {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()
  const role = profile?.role ?? 'AO'
  const categories = NAV_BY_ROLE[role] ?? AO_NAV

  return (
    <aside className="w-[195px] shrink-0 bg-[#001f5b] flex flex-col overflow-y-auto">
      {categories.map((cat) => (
        <div key={cat.label}>
          <div className="px-3.5 pt-3.5 pb-1 text-[8px] font-bold tracking-[1.8px] uppercase text-white/30">
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
                    : 'text-white/58 border-transparent hover:bg-white/[0.06] hover:text-white/85'
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

      {/* Bottom KPI widget for AO/BOH/ADMIN */}
      {(role === 'AO' || role === 'BOH' || role === 'ADMIN') && (
        <div className="mx-3.5 mb-3 mt-2 bg-[rgba(240,180,41,0.10)] border border-[rgba(240,180,41,0.20)] rounded-[10px] p-3">
          <div className="text-[9px] text-[#f0b429] font-semibold">KPI Bulan Ini</div>
          <div className="text-xl font-extrabold text-white my-0.5">—%</div>
          <div className="bg-white/10 rounded h-1 mt-1">
            <div className="bg-[#f0b429] h-1 rounded w-0" />
          </div>
          <div className="text-[8px] text-white/35 mt-1">Set target untuk lihat progress</div>
        </div>
      )}

      {/* Bottom antrian widget for DK */}
      {role === 'DK' && (
        <div className="mx-3.5 mb-3 mt-2 bg-[rgba(204,0,0,0.10)] border border-[rgba(204,0,0,0.20)] rounded-[10px] p-3 text-center">
          <div className="text-[9px] text-white/50">Antrian</div>
          <div className="text-2xl font-extrabold text-[#CC0000] leading-none my-1">—</div>
          <div className="text-[8px] text-white/35">item menunggu</div>
        </div>
      )}

      {/* Sign out */}
      <button
        onClick={() => signOut()}
        className="flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] font-medium text-white/50 hover:text-red-300 hover:bg-red-500/10 transition-colors border-t border-white/[0.06]"
      >
        <LogOut className="w-[15px] h-[15px] shrink-0" />
        <span>Keluar</span>
      </button>
    </aside>
  )
}

