'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useKPI } from '@/hooks/useKPI'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

const schema = z.object({
  period_year: z.coerce.number().min(2020).max(2100),
  period_month: z.coerce.number().min(1).max(12),
  target_dn: z.coerce.number().min(0),
  target_completed: z.coerce.number().min(0),
  target_overdue_pct: z.coerce.number().min(0).max(100),
})

type TargetFormValues = z.infer<typeof schema>

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export function TargetForm() {
  const { profile } = useAuth()
  const { setTarget } = useKPI(profile?.branch_code ?? '')
  const [success, setSuccess] = useState(false)
  const [serverErr, setServerErr] = useState<string | null>(null)

  const now = new Date()
  const form = useForm<TargetFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      period_year: now.getFullYear(),
      period_month: now.getMonth() + 1,
      target_dn: 0,
      target_completed: 0,
      target_overdue_pct: 5,
    },
  })

  const onSubmit = async (values: TargetFormValues) => {
    if (!profile) return
    setServerErr(null)
    const { error } = await setTarget({ ...values, branch_code: profile.branch_code ?? '', created_by: profile.id })
    if (error) setServerErr(error.message)
    else setSuccess(true)
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#002D62]/30 focus:border-[#002D62]'
  const errCls = 'text-xs text-red-500 mt-1'

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Tahun *</label>
          <input {...form.register('period_year')} type="number" className={inputCls} />
          {form.formState.errors.period_year && <p className={errCls}>{form.formState.errors.period_year.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Bulan *</label>
          <select {...form.register('period_month')} className={inputCls}>
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Target Total DN</label>
        <input {...form.register('target_dn')} type="number" className={inputCls} />
        {form.formState.errors.target_dn && <p className={errCls}>{form.formState.errors.target_dn.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Target DN Selesai</label>
        <input {...form.register('target_completed')} type="number" className={inputCls} />
        {form.formState.errors.target_completed && <p className={errCls}>{form.formState.errors.target_completed.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Maks. % Keterlambatan (%)</label>
        <input {...form.register('target_overdue_pct')} type="number" step="0.1" className={inputCls} />
        {form.formState.errors.target_overdue_pct && <p className={errCls}>{form.formState.errors.target_overdue_pct.message}</p>}
      </div>

      {serverErr && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2">{serverErr}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-4 py-2">Target berhasil disimpan!</p>}

      <button type="submit" disabled={form.formState.isSubmitting}
        className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#002D62] rounded-lg hover:bg-[#003f8a] disabled:opacity-60 transition-colors">
        {form.formState.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Simpan Target
      </button>
    </form>
  )
}
