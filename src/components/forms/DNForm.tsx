'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { generateDNNumber, formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2, User, CreditCard, FileText, Eye } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'

type FormValues = {
  debtor_name: string
  debtor_cif: string
  debtor_nik: string
  debtor_phone: string
  credit_type: string
  credit_type_other: string
  credit_amount: string   // string for display
  credit_application_date: string
  slik_status: string
  pic_type: string
  title: string
}

type StepErrors = Partial<Record<keyof FormValues, string>>

const STEPS = [
  { label: 'Data Debitur',  icon: User },
  { label: 'Info Kredit',   icon: CreditCard },
  { label: 'Dokumen',       icon: FileText },
  { label: 'Review',        icon: Eye },
]

function formatThousands(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('en-US')
}

function validateStep(step: number, values: FormValues): StepErrors {
  const errs: StepErrors = {}
  if (step === 0) {
    if (!values.debtor_name.trim()) errs.debtor_name = 'Nama debitur wajib diisi'
    if (!/^\d{16}$/.test(values.debtor_nik)) errs.debtor_nik = 'NIK harus tepat 16 digit angka'
    if (!values.debtor_phone.trim() || values.debtor_phone.length < 9) errs.debtor_phone = 'Nomor HP minimal 9 digit'
    if (!values.debtor_cif.trim()) errs.debtor_cif = 'CIF wajib diisi'
  }
  if (step === 1) {
    if (!values.credit_type) errs.credit_type = 'Jenis kredit wajib dipilih'
    if (values.credit_type === 'OTHER' && !values.credit_type_other.trim()) errs.credit_type_other = 'Tulis jenis kredit lainnya'
    const amt = Number(values.credit_amount.replace(/,/g, ''))
    if (!amt || amt <= 0) errs.credit_amount = 'Plafond kredit wajib diisi'
    if (!values.credit_application_date) errs.credit_application_date = 'Tanggal pengajuan wajib diisi'
    if (!values.slik_status) errs.slik_status = 'Status SLIK wajib dipilih'
  }
  if (step === 2) {
    if (!values.title.trim() || values.title.length < 5) errs.title = 'Judul DN minimal 5 karakter'
  }
  return errs
}

export function DNForm() {
  const router      = useRouter()
  const supabase    = createClient()
  const { profile } = useAuth()
  const { lang }    = useI18n()
  const [step, setStep]           = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [errors, setErrors]       = useState<StepErrors>({})
  const [dnNumber, setDnNumber]   = useState(() => generateDNNumber('XXX'))
  const [slikFile, setSlikFile]   = useState<File | null>(null)

  const [values, setValues] = useState<FormValues>({
    debtor_name: '', debtor_cif: '', debtor_nik: '', debtor_phone: '',
    credit_type: '', credit_type_other: '', credit_amount: '',
    credit_application_date: '', slik_status: '', pic_type: 'RM', title: '',
  })

  useEffect(() => {
    if (profile?.branch_code) setDnNumber(generateDNNumber(profile.branch_code))
  }, [profile?.branch_code])

  function set(field: keyof FormValues, val: string) {
    setValues((prev) => ({ ...prev, [field]: val }))
    if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e })
  }

  function nextStep() {
    const errs = validateStep(step, values)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setStep((s) => Math.min(s + 1, 3))
  }

  function prevStep() { setStep((s) => Math.max(s - 1, 0)) }

  const handleSubmit = async () => {
    if (!profile) return
    setSubmitting(true)
    setSubmitError(null)
    const amt = Number(values.credit_amount.replace(/,/g, ''))
    const finalType = values.credit_type === 'OTHER' ? (values.credit_type_other.trim() || 'OTHER') : values.credit_type
    const today = new Date().toISOString().slice(0, 10)

    const { data: dn, error: dnErr } = await supabase
      .from('decision_notes')
      .insert({
        dn_number: dnNumber,
        title: values.title,
        debtor_name: values.debtor_name,
        debtor_cif: values.debtor_cif,
        debtor_nik: values.debtor_nik,
        debtor_phone: values.debtor_phone,
        credit_amount: amt,
        credit_type: finalType,
        credit_application_date: values.credit_application_date,
        approval_date: today,
        rm_id: profile.id,
        slik_status: values.slik_status as 'HIJAU' | 'KUNING' | 'MERAH',
        pic_type: values.pic_type as 'RM' | 'ADK' | 'BOTH',
        status: 'SUBMITTED',
        priority: 'MEDIUM',
        branch_code: profile.branch_code ?? '',
      })
      .select()
      .single()

    if (dnErr || !dn) {
      setSubmitError(dnErr?.message ?? 'Gagal membuat DN')
      setSubmitting(false)
      return
    }

    // Upload file SLIK opsional ke storage lalu simpan path-nya
    if (slikFile) {
      const slikFormData = new FormData()
      slikFormData.append('file', slikFile)
      slikFormData.append('dnId', dn.id)
      slikFormData.append('pathPrefix', 'slik')
      slikFormData.append('saveRecord', 'false')
      const upRes = await fetch('/api/upload/evidence', { method: 'POST', body: slikFormData })
      const upJson = await upRes.json()
      if (upRes.ok && upJson.path) {
        await supabase.from('decision_notes').update({ slik_file_path: upJson.path }).eq('id', dn.id)
      }
    }

    setSubmitting(false)
    router.push(`/decision-notes/${dn.id}`)
  }

  const inputCls    = 'w-full rounded-lg border border-[#cbd5e0] px-3 py-2.5 text-[13px] text-[#0f172a] bg-white placeholder:text-[#94a3b8] focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/15 transition-colors'
  const readonlyCls = 'w-full rounded-lg border border-[#cbd5e0] px-3 py-2.5 text-[13px] text-[#0f172a] bg-[#f1f5f9] font-mono'
  const labelCls    = 'block text-[11px] font-semibold text-[#1e293b] mb-1.5'
  const errCls      = 'text-[10px] text-red-600 mt-1 font-medium'
  const fieldErr    = (k: keyof FormValues) => errors[k] ? <p className={errCls}>{errors[k]}</p> : null

  return (
    <div className="max-w-xl mx-auto">
      {/* ── Progress steps ─────────────────────────── */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const done    = i < step
          const current = i === step
          return (
            <div key={s.label} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                  done    ? 'bg-[#22c55e] border-[#22c55e] text-white' :
                  current ? 'bg-[#003087] border-[#003087] text-white' :
                            'bg-white border-[#cbd5e0] text-[#94a3b8]'
                }`}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className={`text-[8.5px] mt-1 font-medium truncate max-w-[60px] text-center ${current ? 'text-[#003087]' : done ? 'text-[#22c55e]' : 'text-[#94a3b8]'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 rounded transition-all ${done ? 'bg-[#22c55e]' : 'bg-[#e2e8f0]'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Step 0: Data Debitur ─────────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-[13px] font-bold text-[#002470] mb-1">Data Debitur</h2>
          <div>
            <label className={labelCls}>Nama Debitur <span className="text-red-500">*</span></label>
            <input value={values.debtor_name} onChange={(e) => set('debtor_name', e.target.value)}
              className={inputCls} placeholder="Nama lengkap debitur" />
            {fieldErr('debtor_name')}
          </div>
          <div>
            <label className={labelCls}>NIK KTP <span className="text-red-500">*</span></label>
            <input value={values.debtor_nik}
              onChange={(e) => set('debtor_nik', e.target.value.replace(/\D/g, '').slice(0, 16))}
              className={inputCls} placeholder="16 digit NIK KTP" inputMode="numeric" maxLength={16} />
            {fieldErr('debtor_nik')}
          </div>
          <div>
            <label className={labelCls}>No. HP/WhatsApp <span className="text-red-500">*</span></label>
            <input value={values.debtor_phone} onChange={(e) => set('debtor_phone', e.target.value)}
              className={inputCls} placeholder="Contoh: 08123456789" inputMode="tel" type="tel" />
            {fieldErr('debtor_phone')}
          </div>
          <div>
            <label className={labelCls}>CIF Debitur <span className="text-red-500">*</span></label>
            <input value={values.debtor_cif} onChange={(e) => set('debtor_cif', e.target.value)}
              className={inputCls} placeholder="Nomor CIF" />
            {fieldErr('debtor_cif')}
          </div>
        </div>
      )}

      {/* ── Step 1: Info Kredit ──────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-[13px] font-bold text-[#002470] mb-1">Informasi Kredit</h2>
          <div>
            <label className={labelCls}>Jenis Kredit <span className="text-red-500">*</span></label>
            <select value={values.credit_type} onChange={(e) => set('credit_type', e.target.value)} className={inputCls}>
              <option value="">Pilih jenis kredit</option>
              <option value="KUR">KUR</option>
              <option value="KMK">KMK</option>
              <option value="KI">{lang === 'en' ? 'Investment Credit' : 'Kredit Investasi'}</option>
              <option value="KPR">KPR</option>
              <option value="BRIGUNA">BRIGUNA</option>
              <option value="OTHER">{lang === 'en' ? 'Other' : 'Lainnya'}</option>
            </select>
            {fieldErr('credit_type')}
          </div>
          {values.credit_type === 'OTHER' && (
            <div>
              <label className={labelCls}>Jenis Kredit Lainnya <span className="text-red-500">*</span></label>
              <input value={values.credit_type_other} onChange={(e) => set('credit_type_other', e.target.value)}
                className={inputCls} placeholder="Tuliskan jenis kredit" />
              {fieldErr('credit_type_other')}
            </div>
          )}
          <div>
            <label className={labelCls}>Plafond Kredit (Rp) <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#64748b] font-medium pointer-events-none">Rp</span>
              <input type="text" inputMode="numeric"
                value={values.credit_amount}
                onChange={(e) => set('credit_amount', formatThousands(e.target.value))}
                className={inputCls + ' pl-9'} placeholder="0" />
            </div>
            {values.credit_amount && (
              <p className="text-[9px] text-[#64748b] mt-1">= {formatCurrency(Number(values.credit_amount.replace(/,/g, '')))}</p>
            )}
            {fieldErr('credit_amount')}
          </div>
          <div>
            <label className={labelCls}>Tanggal Pengajuan Kredit <span className="text-red-500">*</span></label>
            <input type="date" value={values.credit_application_date}
              onChange={(e) => set('credit_application_date', e.target.value)} className={inputCls} />
            {fieldErr('credit_application_date')}
          </div>
          <div>
            <label className={labelCls}>Status SLIK <span className="text-red-500">*</span></label>
            <p className="text-[9px] text-[#64748b] mb-1.5">Sistem Layanan Informasi Keuangan — pilih sesuai hasil pengecekan.</p>
            <select value={values.slik_status} onChange={(e) => set('slik_status', e.target.value)} className={inputCls}>
              <option value="">Pilih status SLIK</option>
              <option value="HIJAU">🟢 Hijau — SLIK bagus (lancar)</option>
              <option value="KUNING">🟡 Kuning — Hati-hati (pernah menunggak)</option>
              <option value="MERAH">🔴 Merah — SLIK tidak bagus (bermasalah)</option>
            </select>
            {values.slik_status && (
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: values.slik_status === 'HIJAU' ? '#e8f5e9' : values.slik_status === 'KUNING' ? '#fff8e1' : '#ffebee',
                    color:      values.slik_status === 'HIJAU' ? '#16a34a' : values.slik_status === 'KUNING' ? '#b8890a' : '#CC0000',
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: values.slik_status === 'HIJAU' ? '#16a34a' : values.slik_status === 'KUNING' ? '#f0b429' : '#CC0000' }}
                  />
                  SLIK {values.slik_status === 'HIJAU' ? 'Hijau' : values.slik_status === 'KUNING' ? 'Kuning' : 'Merah'}
                </span>
              </div>
            )}
            {fieldErr('slik_status')}
          </div>
        </div>
      )}

      {/* ── Step 2: Dokumen ──────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-[13px] font-bold text-[#002470] mb-1">Info Dokumen</h2>
          <div>
            <label className={labelCls}>Nomor DN (otomatis)</label>
            <input readOnly value={dnNumber} className={readonlyCls} />
            <p className="text-[9px] text-[#64748b] mt-1">Dibuat otomatis dari kode cabang &amp; waktu.</p>
          </div>
          <div>
            <label className={labelCls}>Judul Catatan Pemutus <span className="text-red-500">*</span></label>
            <input value={values.title} onChange={(e) => set('title', e.target.value)}
              className={inputCls} placeholder="Judul ringkas untuk DN ini" />
            {fieldErr('title')}
          </div>
          <div>
            <label className={labelCls}>PIC Pelaksana Tindak Lanjut <span className="text-red-500">*</span></label>
            <p className="text-[9px] text-[#64748b] mb-1.5">Penanggung jawab pemenuhan tindak lanjut setelah diputus.</p>
            <select value={values.pic_type} onChange={(e) => set('pic_type', e.target.value)} className={inputCls}>
              <option value="RM">RM (Relationship Manager)</option>
              <option value="ADK">ADK - POK</option>
              <option value="BOTH">RM &amp; ADK - POK (keduanya)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Upload Dokumen SLIK (opsional)</label>
            <p className="text-[9px] text-[#64748b] mb-1.5">Lampirkan hasil pengecekan SLIK bila tersedia (PDF/gambar).</p>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setSlikFile(e.target.files?.[0] ?? null)}
              className="block w-full text-[11px] text-[#475569] file:mr-3 file:rounded-lg file:border-0 file:bg-[#003087] file:px-3 file:py-2 file:text-[11px] file:font-semibold file:text-white hover:file:bg-[#002470] cursor-pointer"
            />
            {slikFile && <p className="text-[9px] text-[#16a34a] mt-1 font-medium">✓ {slikFile.name}</p>}
          </div>
          <div className="rounded-lg bg-[#fffbe0] border border-[#f0b429]/40 px-3 py-2.5">
            <p className="text-[10.5px] text-[#7a5e10]">
              💡 {lang === 'en'
                ? 'After submitting, this DN will be sent to the CBM / Manager (Decider) for a decision.'
                : 'Setelah dikirim, DN ini masuk ke antrian CBM / Manager (Pemutus) untuk diputuskan.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Step 3: Review ───────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-[13px] font-bold text-[#002470] mb-1">Review &amp; Submit</h2>
          <div className="bg-[#f8fafc] rounded-[10px] border border-[#e8ecf4] divide-y divide-[#e8ecf4] overflow-hidden">
            {([
              ['Nama Debitur',         values.debtor_name],
              ['NIK KTP',              values.debtor_nik],
              ['No. HP/WA',            values.debtor_phone],
              ['CIF',                  values.debtor_cif],
              ['Jenis Kredit',         values.credit_type === 'OTHER' ? values.credit_type_other : values.credit_type],
              ['Plafond Kredit',       formatCurrency(Number(values.credit_amount.replace(/,/g, '')))],
              ['Status SLIK',          values.slik_status === 'HIJAU' ? '🟢 Hijau' : values.slik_status === 'KUNING' ? '🟡 Kuning' : values.slik_status === 'MERAH' ? '🔴 Merah' : ''],
              ['Tgl. Pengajuan',       values.credit_application_date],
              ['PIC Pelaksana',        values.pic_type === 'BOTH' ? 'RM & ADK - POK' : values.pic_type === 'ADK' ? 'ADK - POK' : 'RM'],
              ['Dokumen SLIK',         slikFile ? slikFile.name : 'Tidak dilampirkan'],
              ['Nomor DN',             dnNumber],
              ['Judul DN',             values.title],
            ] as [string, string][]).map(([label, val]) => (
              <div key={label} className="flex items-start px-3.5 py-2.5 gap-3">
                <span className="text-[9.5px] text-[#9ca3af] w-32 shrink-0">{label}</span>
                <span className="text-[10px] font-semibold text-[#002470] break-all">{val || '—'}</span>
              </div>
            ))}
          </div>
          {submitError && (
            <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{submitError}</p>
          )}
        </div>
      )}

      {/* ── Navigation ───────────────────────────────── */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t border-[#e8ecf4]">
        <button
          type="button"
          onClick={prevStep}
          disabled={step === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-semibold text-[#718096] bg-[#f0f4f8] border border-[#e8ecf4] rounded-lg hover:bg-[#e8ecf4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Kembali
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={nextStep}
            className="flex items-center gap-1.5 px-5 py-2.5 text-[11px] font-semibold text-white bg-[#003087] rounded-lg hover:bg-[#002470] transition-colors"
          >
            Lanjut <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-2.5 text-[11px] font-semibold text-white bg-[#003087] rounded-lg hover:bg-[#002470] disabled:opacity-60 transition-colors"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Kirim ke Pemutus
          </button>
        )}
      </div>
    </div>
  )
}
