'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { generateDNNumber } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'

// ─── Zod Schema ───────────────────────────────────────────────────
const schema = z.object({
  debtor_name: z.string().min(2, 'Nama debitur wajib diisi'),
  debtor_cif: z.string().min(3, 'CIF wajib diisi'),
  credit_type: z.string().min(2, 'Jenis kredit wajib diisi'),
  credit_amount: z.coerce.number().positive('Jumlah kredit harus positif'),
  dn_number: z.string().min(3, 'Nomor DN wajib diisi'),
  title: z.string().min(5, 'Judul wajib diisi'),
  approval_date: z.string().min(1, 'Tanggal persetujuan wajib diisi'),
  approval_number: z.string().optional(),
  conditions: z.array(z.object({
    condition_text: z.string().min(5, 'Isi kondisi wajib diisi'),
    condition_type: z.string().default('STANDARD'),
    due_date: z.string().min(1, 'Tanggal batas wajib diisi'),
    assigned_to: z.string().optional(),
  })).min(1, 'Minimal 1 kondisi'),
  followup_actions: z.array(z.object({
    action_text: z.string().min(5, 'Isi tindak lanjut wajib diisi'),
    due_date: z.string().min(1, 'Tanggal batas wajib diisi'),
    assigned_to: z.string().optional(),
  })),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  notes: z.string().optional(),
})

type DNFormValues = z.infer<typeof schema>

const STEPS = ['Data Debitur', 'Info Persetujuan', 'Kondisi', 'Tindak Lanjut', 'Review & Submit']

export function DNForm() {
  const router = useRouter()
  const supabase = createClient()
  const { profile } = useAuth()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<DNFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      conditions: [{ condition_text: '', condition_type: 'STANDARD', due_date: '', assigned_to: '' }],
      followup_actions: [],
      priority: 'MEDIUM',
    },
  })

  const { fields: condFields, append: appendCond, remove: removeCond } = useFieldArray({ control: form.control, name: 'conditions' })
  const { fields: fuFields, append: appendFU, remove: removeFU } = useFieldArray({ control: form.control, name: 'followup_actions' })

  const stepFields: (keyof DNFormValues)[][] = [
    ['debtor_name', 'debtor_cif', 'credit_type', 'credit_amount'],
    ['dn_number', 'title', 'approval_date', 'approval_number'],
    ['conditions'],
    ['followup_actions'],
    ['priority', 'notes'],
  ]

  const goNext = async () => {
    const valid = await form.trigger(stepFields[step] as (keyof DNFormValues)[])
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const onSubmit = async (values: DNFormValues) => {
    if (!profile) return
    setSubmitting(true)
    setError(null)

    const dnNumber = values.dn_number || generateDNNumber(profile.branch_code ?? 'XXX')
    const { data: dn, error: dnErr } = await supabase
      .from('decision_notes')
      .insert({
        dn_number: dnNumber,
        title: values.title,
        debtor_name: values.debtor_name,
        debtor_cif: values.debtor_cif,
        credit_amount: values.credit_amount,
        credit_type: values.credit_type,
        approval_date: values.approval_date,
        approval_number: values.approval_number ?? null,
        ao_id: profile.id,
        status: 'DRAFT',
        priority: values.priority,
        notes: values.notes ?? null,
        branch_code: profile.branch_code ?? '',
      })
      .select()
      .single()

    if (dnErr || !dn) {
      setError(dnErr?.message ?? 'Gagal membuat DN')
      setSubmitting(false)
      return
    }

    // Insert conditions
    if (values.conditions.length > 0) {
      await supabase.from('dn_conditions').insert(
        values.conditions.map((c, i) => ({
          dn_id: dn.id,
          condition_text: c.condition_text,
          condition_type: c.condition_type,
          due_date: c.due_date || null,
          assigned_to: c.assigned_to || null,
          sort_order: i,
        }))
      )
    }

    // Insert follow-up actions
    if (values.followup_actions.length > 0) {
      await supabase.from('followup_actions').insert(
        values.followup_actions.map((f) => ({
          dn_id: dn.id,
          action_text: f.action_text,
          due_date: f.due_date,
          assigned_to: f.assigned_to || profile.id,
          created_by: profile.id,
        }))
      )
    }

    setSubmitting(false)
    router.push(`/decision-notes/${dn.id}`)
  }

  const inputCls = 'w-full rounded-md border border-[#e8ecf4] px-3 py-2 text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/10 transition-colors'
  const errCls   = 'text-[9px] text-red-500 mt-1'

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step wizard */}
      <div className="flex items-start mb-6">
        {STEPS.map((label, i) => {
          const isDone    = i < step
          const isCurrent = i === step
          return (
            <div key={i} className="flex items-start flex-1 min-w-0">
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                  isDone    ? 'bg-[#003087] border-[#003087] text-white'
                  : isCurrent ? 'bg-[#f0b429] border-[#f0b429] text-[#002470]'
                  : 'bg-white border-[#d1d5db] text-[#9ca3af]'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span className={`text-[9px] mt-1 text-center hidden sm:block ${
                  isCurrent ? 'text-[#003087] font-semibold' : 'text-[#9ca3af]'
                }`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-[2px] flex-1 mt-[13px] mx-0.5 ${isDone ? 'bg-[#003087]' : 'bg-[#e8ecf4]'}`} />
              )}
            </div>
          )
        })}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 0 */}
        {step === 0 && (
          <div className="space-y-3.5">
            <div className="bg-[#003087] text-white rounded px-3 py-2 text-[10px] font-bold">Data Debitur</div>
            <div>
              <label className="text-sm font-medium text-gray-700">Nama Debitur *</label>
              <input {...form.register('debtor_name')} className={inputCls} placeholder="Nama lengkap debitur" />
              {form.formState.errors.debtor_name && <p className={errCls}>{form.formState.errors.debtor_name.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">CIF Debitur *</label>
              <input {...form.register('debtor_cif')} className={inputCls} placeholder="Nomor CIF" />
              {form.formState.errors.debtor_cif && <p className={errCls}>{form.formState.errors.debtor_cif.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Jenis Kredit *</label>
              <select {...form.register('credit_type')} className={inputCls}>
                <option value="">Pilih jenis kredit</option>
                <option value="KUR">KUR</option>
                <option value="KMK">KMK</option>
                <option value="KI">Kredit Investasi</option>
                <option value="KPR">KPR</option>
                <option value="KPRK">KPRK</option>
                <option value="BRIGUNA">BRIGUNA</option>
                <option value="OTHER">Lainnya</option>
              </select>
              {form.formState.errors.credit_type && <p className={errCls}>{form.formState.errors.credit_type.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Jumlah Kredit (Rp) *</label>
              <input {...form.register('credit_amount')} type="number" className={inputCls} placeholder="0" />
              {form.formState.errors.credit_amount && <p className={errCls}>{form.formState.errors.credit_amount.message}</p>}
            </div>
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-3.5">
            <div className="bg-[#003087] text-white rounded px-3 py-2 text-[10px] font-bold">Info Persetujuan</div>
            <div>
              <label className="text-sm font-medium text-gray-700">Nomor DN *</label>
              <input {...form.register('dn_number')} className={inputCls} placeholder="DN/KODE/YYYYMM/0001" />
              {form.formState.errors.dn_number && <p className={errCls}>{form.formState.errors.dn_number.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Judul DN *</label>
              <input {...form.register('title')} className={inputCls} placeholder="Judul Decision Note" />
              {form.formState.errors.title && <p className={errCls}>{form.formState.errors.title.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tanggal Persetujuan *</label>
              <input {...form.register('approval_date')} type="date" className={inputCls} />
              {form.formState.errors.approval_date && <p className={errCls}>{form.formState.errors.approval_date.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Nomor Surat Persetujuan</label>
              <input {...form.register('approval_number')} className={inputCls} placeholder="Opsional" />
            </div>
          </div>
        )}

        {/* Step 2 – Conditions */}
        {step === 2 && (
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="bg-[#003087] text-white rounded px-3 py-2 text-[10px] font-bold flex-1">Kondisi Pasca Persetujuan</div>
              <button type="button" onClick={() => appendCond({ condition_text: '', condition_type: 'STANDARD', due_date: '', assigned_to: '' })}
                className="flex items-center gap-1 text-[10px] text-[#003087] font-semibold hover:underline whitespace-nowrap">
                <Plus className="w-3 h-3" /> Tambah
              </button>
            </div>
            {condFields.map((field, i) => (
              <div key={field.id} className="border border-[#e8ecf4] rounded-lg p-3 space-y-2.5 bg-[#fafbfc]">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-500">Kondisi {i + 1}</span>
                  {i > 0 && (
                    <button type="button" onClick={() => removeCond(i)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <textarea {...form.register(`conditions.${i}.condition_text`)} rows={2} className={inputCls} placeholder="Isi kondisi..." />
                {form.formState.errors.conditions?.[i]?.condition_text && (
                  <p className={errCls}>{form.formState.errors.conditions[i]?.condition_text?.message}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Jenis</label>
                    <select {...form.register(`conditions.${i}.condition_type`)} className={inputCls}>
                      <option value="STANDARD">Standard</option>
                      <option value="PRECEDENT">Preseden</option>
                      <option value="SUBSEQUENT">Subsequent</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Batas Tanggal *</label>
                    <input {...form.register(`conditions.${i}.due_date`)} type="date" className={inputCls} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3 – Follow-up */}
        {step === 3 && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="bg-[#003087] text-white rounded px-3 py-2 text-[10px] font-bold flex-1">Tindak Lanjut</div>
              <button type="button" onClick={() => appendFU({ action_text: '', due_date: '', assigned_to: '' })}
                className="flex items-center gap-1 text-sm text-[#002D62] hover:underline">
                <Plus className="w-4 h-4" /> Tambah
              </button>
            </div>
            {fuFields.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Tidak ada tindak lanjut (opsional)</p>
            )}
            {fuFields.map((field, i) => (
              <div key={field.id} className="border rounded-xl p-4 space-y-3 bg-gray-50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-500">Tindak Lanjut {i + 1}</span>
                  <button type="button" onClick={() => removeFU(i)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <textarea {...form.register(`followup_actions.${i}.action_text`)} rows={2} className={inputCls} placeholder="Isi tindak lanjut..." />
                <div>
                  <label className="text-xs text-gray-500">Batas Tanggal *</label>
                  <input {...form.register(`followup_actions.${i}.due_date`)} type="date" className={inputCls} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 4 – Review */}
        {step === 4 && (
          <div className="space-y-3.5">
            <div className="bg-[#003087] text-white rounded px-3 py-2 text-[10px] font-bold">Review &amp; Submit</div>
            <div className="bg-[#fafbfc] rounded-lg border border-[#e8ecf4] p-4 space-y-2 text-[11px]">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-gray-500">Debitur</span><span className="font-medium">{form.watch('debtor_name')}</span>
                <span className="text-gray-500">CIF</span><span className="font-medium">{form.watch('debtor_cif')}</span>
                <span className="text-gray-500">Jenis Kredit</span><span className="font-medium">{form.watch('credit_type')}</span>
                <span className="text-gray-500">Nomor DN</span><span className="font-medium">{form.watch('dn_number')}</span>
                <span className="text-gray-500">Kondisi</span><span className="font-medium">{form.watch('conditions').length} kondisi</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Prioritas</label>
              <select {...form.register('priority')} className={inputCls}>
                <option value="LOW">Rendah</option>
                <option value="MEDIUM">Sedang</option>
                <option value="HIGH">Tinggi</option>
                <option value="CRITICAL">Kritis</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Catatan Tambahan</label>
              <textarea {...form.register('notes')} rows={3} className={inputCls} placeholder="Opsional..." />
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2">{error}</p>}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4">
          <button type="button" onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 text-[11px] font-medium text-[#002470] bg-white border border-[#e8ecf4] rounded-lg hover:bg-[#f0f4f8] disabled:opacity-40">
            <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={goNext}
              className="flex items-center gap-1 px-5 py-2 text-[11px] font-semibold text-white bg-[#003087] rounded-lg hover:bg-[#002470] transition-colors">
              Berikutnya <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 text-[11px] font-semibold text-white bg-[#003087] rounded-lg hover:bg-[#002470] disabled:opacity-60 transition-colors">
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Simpan DN
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
