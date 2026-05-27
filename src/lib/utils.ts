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
  SUBMITTED: 'Diajukan',
  VERIFIED_DK: 'Terverifikasi DK',
  VERIFIED_BOH: 'Terverifikasi BOH',
  COMPLETED: 'Selesai',
  ESCALATED: 'Dieskalasi',
  REJECTED: 'Ditolak',
  PENDING: 'Menunggu',
  IN_PROGRESS: 'Sedang Berjalan',
  OVERDUE: 'Terlambat',
  WAIVED: 'Dibebaskan',
}

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  VERIFIED_DK: 'bg-yellow-100 text-yellow-700',
  VERIFIED_BOH: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  ESCALATED: 'bg-red-100 text-red-700',
  REJECTED: 'bg-red-100 text-red-800',
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
