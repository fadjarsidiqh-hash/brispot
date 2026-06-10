'use client'

import { DNForm } from '@/components/forms/DNForm'
import { useI18n } from '@/contexts/I18nContext'

export default function NewDNPage() {
  const { t, lang } = useI18n()
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#0f172a]">{t.dnForm.title}</h1>
        <p className="text-sm text-[#475569]">
          {lang === 'en'
            ? 'Fill in the form below and submit to the Authorizer (CBM / Manager) for approval.'
            : 'Isi formulir berikut lalu kirim ke Pemutus (CBM / Manager) untuk diputuskan.'}
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6">
        <DNForm />
      </div>
    </div>
  )
}
