'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, Save, FileText, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { DecisionNote } from '@/types'
import { CHECKLIST_SECTIONS, type ChecklistItemState, emptyChecklist } from '@/lib/docChecklist'

interface Props {
  dn: DecisionNote
  opini: string
  onOpiniChange: (v: string) => void
}

export function DocReviewChecklist({ dn, opini, onOpiniChange }: Props) {
  const [items, setItems] = useState<Record<string, ChecklistItemState>>(emptyChecklist)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (supabase as any).schema('brimos')

  // Get current user once
  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      if (data?.user) setUserId(data.user.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load existing checklist when dn changes — includes race-condition guard
  useEffect(() => {
    setItems(emptyChecklist())
    setOpen(false)
    setExpandedSections(new Set())
    onOpiniChange('')
    if (!dn?.id) return

    let cancelled = false
    const currentId = dn.id

    db.from('doc_review_checklist')
      .select('items, opini')
      .eq('dn_id', currentId)
      .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => {
        if (cancelled) return
        if (data) {
          setItems({ ...emptyChecklist(), ...(data.items ?? {}) })
          if (data.opini) onOpiniChange(data.opini)
        }
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dn?.id])

  const filledCount = Object.values(items).filter((v) => v.status !== null).length
  const totalCount = Object.keys(items).length

  const setItem = (id: string, field: 'status' | 'keterangan', value: string | null) => {
    setItems((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  const toggleSection = (sId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sId)) next.delete(sId)
      else next.add(sId)
      return next
    })
  }

  const doSave = async (): Promise<boolean> => {
    if (!userId) return false
    setSaving(true)
    setSaveError(false)
    try {
      const { error } = await db.from('doc_review_checklist').upsert(
        {
          dn_id: dn.id,
          adk_id: userId,
          items,
          opini,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'dn_id' }
      )
      if (error) {
        setSaveError(true)
        setTimeout(() => setSaveError(false), 3000)
        return false
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      return true
    } catch {
      setSaveError(true)
      setTimeout(() => setSaveError(false), 3000)
      return false
    } finally {
      setSaving(false)
    }
  }

  // Bug fix: open the window BEFORE awaiting save so popup blocker is not triggered
  const handleExportPDF = () => {
    const printWindow = window.open(`/print/checklist/${dn.id}`, '_blank')
    doSave().then((ok) => {
      if (!ok && printWindow) {
        // Save failed — reload the print page so it shows what was already in DB
        printWindow.location.reload()
      }
    })
  }

  return (
    <div className="border border-[#003087]/20 rounded-lg overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#003087]/5 hover:bg-[#003087]/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-[#003087]" />
          <span className="text-[10px] font-bold text-[#003087]">Checklist Dokumen ADK</span>
          <span className="bg-[#003087] text-white text-[8px] px-1.5 py-0.5 rounded-full">
            {filledCount}/{totalCount} diisi
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-[#003087]" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-[#003087]" />
        )}
      </button>

      {open && (
        <div className="p-3 space-y-2">
          {/* Sections */}
          {CHECKLIST_SECTIONS.map((section) => (
            <div key={section.id} className="border border-[#e8ecf4] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-3 py-2 bg-[#f8fafc] hover:bg-[#f0f4f8] transition-colors"
              >
                <span className="text-[9.5px] font-semibold text-[#002470]">{section.label}</span>
                {expandedSections.has(section.id) ? (
                  <ChevronUp className="w-3 h-3 text-[#9ca3af] shrink-0" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-[#9ca3af] shrink-0" />
                )}
              </button>

              {expandedSections.has(section.id) && (
                <div className="divide-y divide-[#e8ecf4]">
                  {section.items.map((item) => {
                    const state = items[item.id] ?? { status: null, keterangan: '' }
                    return (
                      <div key={item.id} className="px-3 py-2 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] text-[#4a5568] flex-1 leading-tight">
                            {item.label}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                setItem(item.id, 'status', state.status === 'ADA' ? null : 'ADA')
                              }
                              className={`text-[8px] px-2 py-1 rounded font-medium border transition-colors ${
                                state.status === 'ADA'
                                  ? 'bg-[#22c55e] text-white border-[#22c55e]'
                                  : 'text-[#22c55e] border-[#22c55e]/40 hover:bg-[#f0fdf4]'
                              }`}
                            >
                              ADA
                            </button>
                            <button
                              onClick={() =>
                                setItem(
                                  item.id,
                                  'status',
                                  state.status === 'TIDAK_ADA' ? null : 'TIDAK_ADA'
                                )
                              }
                              className={`text-[8px] px-2 py-1 rounded font-medium border transition-colors ${
                                state.status === 'TIDAK_ADA'
                                  ? 'bg-[#CC0000] text-white border-[#CC0000]'
                                  : 'text-[#CC0000] border-[#CC0000]/40 hover:bg-[#fff5f5]'
                              }`}
                            >
                              TIDAK ADA
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={state.keterangan}
                          onChange={(e) => setItem(item.id, 'keterangan', e.target.value)}
                          placeholder="Keterangan (opsional)..."
                          className="w-full text-[9px] border border-[#e8ecf4] rounded px-2 py-1 text-[#4a5568] bg-[#fafbfc] focus:outline-none focus:border-[#003087]"
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Opini ADK */}
          <div>
            <label className="block text-[9px] font-bold text-[#002470] mb-1">
              Opini ADK
              <span className="text-[#9ca3af] font-normal ml-1">
                (juga digunakan sebagai catatan / alasan penolakan)
              </span>
            </label>
            <textarea
              value={opini}
              onChange={(e) => onOpiniChange(e.target.value)}
              rows={3}
              placeholder="Catatan verifikasi, kondisi kredit, atau alasan penolakan..."
              className="w-full border border-[#e8ecf4] rounded-lg px-3 py-2 text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/10 resize-none transition-colors"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={doSave}
              disabled={saving}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[9.5px] font-bold text-white rounded-lg transition-colors disabled:opacity-50 ${
                saveError ? 'bg-[#CC0000] hover:bg-[#a00000]' : 'bg-[#003087] hover:bg-[#002470]'
              }`}
            >
              {saving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : saveError ? (
                <span className="text-[9px]">⚠</span>
              ) : saved ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              {saveError ? 'Gagal disimpan!' : saved ? 'Tersimpan!' : 'Simpan Checklist'}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[9.5px] font-bold text-[#003087] bg-[#e8f0fe] border border-[#003087]/20 rounded-lg hover:bg-[#d1e3fc] transition-colors disabled:opacity-50"
            >
              <FileText className="w-3 h-3" /> Export PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
