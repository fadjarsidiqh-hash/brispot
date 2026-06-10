import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: idLocale })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n)
}

export function generateDNNumber(branchCode: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
  return `DN/${branchCode}/${year}/${month}/${random}`
}

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Diajukan ke BOH',
  DECIDED_BOH: 'Diputuskan BOH',
  VERIFIED_ADK: 'Terverifikasi ADK',
  COMPLETED: 'Selesai',
  ESCALATED: 'Dieskalasi',
  REJECTED: 'Ditolak',
  NEEDS_REVISION: 'Perlu Revisi (Dokumen Kurang)',
  PENDING: 'Menunggu',
  IN_PROGRESS: 'Sedang Berjalan',
  OVERDUE: 'Terlambat',
  WAIVED: 'Dibebaskan',
}

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  DECIDED_BOH: 'bg-yellow-100 text-yellow-700',
  VERIFIED_ADK: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  ESCALATED: 'bg-red-100 text-red-700',
  REJECTED: 'bg-red-100 text-red-800',
  NEEDS_REVISION: 'bg-orange-100 text-orange-700',
  PENDING: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  OVERDUE: 'bg-orange-100 text-orange-700',
  WAIVED: 'bg-purple-100 text-purple-700',
}

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

// Label status monitoring sesuai flowchart BRISPOT (NEW / IN PROGRESS / WAITING VERIFICATION / CLOSED / OVERDUE)
export type MonitoringStatus = 'NEW' | 'IN_PROGRESS' | 'WAITING_VERIFICATION' | 'CLOSED' | 'OVERDUE' | 'REJECTED'

export function getMonitoringStatus(dn: { status: string; due_date?: string | null }): MonitoringStatus {
  if (dn.status === 'REJECTED') return 'REJECTED'
  if (dn.status === 'COMPLETED') return 'CLOSED'
  const overdue = !!dn.due_date && new Date(dn.due_date) < new Date()
  if (dn.status === 'ESCALATED' || overdue) return 'OVERDUE'
  if (dn.status === 'SUBMITTED' || dn.status === 'DRAFT') return 'NEW'
  if (dn.status === 'DECIDED_MANAGER' || dn.status === 'DECIDED_BOH') return 'IN_PROGRESS'
  if (dn.status === 'VERIFIED_ADK') return 'WAITING_VERIFICATION'
  return 'IN_PROGRESS'
}

export const MONITORING_META: Record<MonitoringStatus, { label: string; cls: string }> = {
  NEW:                  { label: 'NEW',                  cls: 'bg-[#e8f0fe] text-[#003087]' },
  IN_PROGRESS:          { label: 'IN PROGRESS',          cls: 'bg-[#fff8e1] text-[#b8890a]' },
  WAITING_VERIFICATION: { label: 'WAITING VERIFICATION', cls: 'bg-[#f3e8ff] text-[#7c3aed]' },
  CLOSED:               { label: 'CLOSED',               cls: 'bg-[#e8f5e9] text-[#16a34a]' },
  OVERDUE:              { label: 'OVERDUE',              cls: 'bg-[#fff0f0] text-[#CC0000]' },
  REJECTED:             { label: 'DITOLAK',              cls: 'bg-[#fef2f2] text-[#991b1b]' },
}
