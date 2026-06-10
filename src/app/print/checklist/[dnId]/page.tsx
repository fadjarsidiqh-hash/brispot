'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DecisionNote } from '@/types'
import { CHECKLIST_SECTIONS, type ChecklistItemState, emptyChecklist } from '@/lib/docChecklist'
import { Printer } from 'lucide-react'

interface ChecklistRow {
  items: Record<string, ChecklistItemState>
  opini: string | null
  adk_id: string | null
  updated_at: string | null
}

export default function PrintChecklistPage({ params }: { params: { dnId: string } }) {
  const [dn, setDn] = useState<DecisionNote | null>(null)
  const [checklist, setChecklist] = useState<ChecklistRow | null>(null)
  const [adkName, setAdkName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (supabase as any).schema('brimos')

  useEffect(() => {
    const { dnId } = params
    if (!dnId) { setNotFound(true); setLoading(false); return }

    async function load() {
      try {
        // Load DN
        const { data: dnData } = await db
          .from('decision_notes')
          .select('*')
          .eq('id', dnId)
          .single()

        if (!dnData) { setNotFound(true); return }
        setDn(dnData)

        // Load checklist
        const { data: clData } = await db
          .from('doc_review_checklist')
          .select('*')
          .eq('dn_id', dnId)
          .single()

        if (clData) {
          setChecklist({
            items: { ...emptyChecklist(), ...(clData.items ?? {}) },
            opini: clData.opini ?? null,
            adk_id: clData.adk_id ?? null,
            updated_at: clData.updated_at ?? null,
          })

          if (clData.adk_id) {
            const { data: profileData } = await db
              .from('profiles')
              .select('full_name')
              .eq('id', clData.adk_id)
              .single()
            if (profileData) setAdkName(profileData.full_name ?? '')
          }
        } else {
          // No checklist saved yet – render blank form
          setChecklist({
            items: emptyChecklist(),
            opini: null,
            adk_id: null,
            updated_at: null,
          })
        }
      } finally {
        setLoading(false)
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-gray-500 text-sm">Memuat data formulir...</p>
      </div>
    )
  }

  if (notFound || !dn || !checklist) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-gray-500 text-sm">Data tidak ditemukan.</p>
      </div>
    )
  }

  const items = checklist.items
  const printDate = checklist.updated_at
    ? new Date(checklist.updated_at).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })

  // Flatten all rows for the checklist table
  const tableRows: { type: 'section' | 'item'; sectionLabel?: string; itemId?: string; itemLabel?: string }[] = []
  for (const section of CHECKLIST_SECTIONS) {
    tableRows.push({ type: 'section', sectionLabel: section.label })
    for (const item of section.items) {
      tableRows.push({ type: 'item', itemId: item.id, itemLabel: item.label })
    }
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-before: always; }
        }
        @page { size: A4 portrait; margin: 1.5cm 1.5cm 2cm 1.5cm; }
        * { box-sizing: border-box; }
        body { margin: 0; background: white; }
      `}</style>

      {/* Print / Export button */}
      <div className="no-print fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-[#003087] text-white rounded-lg text-[12px] font-bold shadow-lg hover:bg-[#002470] transition-colors"
        >
          <Printer className="w-4 h-4" />
          Cetak / Simpan PDF
        </button>
      </div>

      {/* A4 Page */}
      <div
        style={{
          maxWidth: '210mm',
          margin: '0 auto',
          padding: '24px 32px',
          background: 'white',
          minHeight: '297mm',
          fontFamily: 'Arial, sans-serif',
          fontSize: '10px',
          color: '#000',
        }}
      >
        {/* ── Header ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
          <tbody>
            <tr>
              <td
                style={{
                  border: '2px solid #000',
                  width: '70px',
                  height: '60px',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  padding: '4px',
                }}
              >
                <div
                  style={{
                    background: '#003087',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: '18px',
                    padding: '4px 6px',
                    letterSpacing: '1px',
                  }}
                >
                  BRI
                </div>
              </td>
              <td
                style={{
                  border: '2px solid #000',
                  borderLeft: 'none',
                  padding: '8px 12px',
                  verticalAlign: 'top',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px' }}>
                  PT. BANK RAKYAT INDONESIA (PERSERO) TBK
                </div>
                <div style={{ fontWeight: 600, fontSize: '10px', marginTop: '2px' }}>
                  KC {dn.branch_code}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Title ── */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontWeight: 900, fontSize: '13px', textDecoration: 'underline', letterSpacing: '1px' }}>
            FORMULIR REVIEW DOKUMEN
          </div>
          <div style={{ fontSize: '9px', marginTop: '2px' }}>
            (untuk pengecekan kelengkapan berkas/review)
          </div>
        </div>

        {/* ── Debtor Info ── */}
        <table style={{ borderCollapse: 'collapse', marginBottom: '12px', fontSize: '10px' }}>
          <tbody>
            {(
              [
                ['Nama Nasabah', dn.debtor_name],
                ['NIK/NPWP', dn.debtor_nik ?? '-'],
                ['REFNO', dn.dn_number],
                ['Telp', dn.debtor_phone ?? '-'],
                ['Alamat', '-'],
              ] as [string, string][]
            ).map(([label, value]) => (
              <tr key={label}>
                <td style={{ paddingRight: '8px', paddingBottom: '2px', fontWeight: 600, width: '100px' }}>
                  {label}
                </td>
                <td style={{ paddingRight: '6px', paddingBottom: '2px', width: '12px' }}>:</td>
                <td style={{ paddingBottom: '2px' }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Checklist Table ── */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #000',
            fontSize: '9px',
            marginBottom: '12px',
          }}
        >
          <thead>
            <tr style={{ background: '#e8e8e8' }}>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', width: '36px' }}>NO</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>JENIS DOKUMEN</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', width: '36px' }}>ADA</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', width: '56px' }}>TIDAK ADA</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', width: '120px' }}>KETERANGAN</th>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '2px 6px', textAlign: 'center', color: '#666' }}>(1)</td>
              <td style={{ border: '1px solid #000', padding: '2px 6px', color: '#666' }}>(2)</td>
              <td style={{ border: '1px solid #000', padding: '2px 6px', textAlign: 'center', color: '#666' }}>(3)</td>
              <td style={{ border: '1px solid #000', padding: '2px 6px', textAlign: 'center', color: '#666' }}>(4)</td>
              <td style={{ border: '1px solid #000', padding: '2px 6px', color: '#666' }}>(5)</td>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, idx) => {
              if (row.type === 'section') {
                return (
                  <tr key={`s-${idx}`} style={{ background: '#f0f0f0' }}>
                    <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center' }}>-</td>
                    <td
                      colSpan={4}
                      style={{ border: '1px solid #000', padding: '3px 6px', fontWeight: 700 }}
                    >
                      {row.sectionLabel}
                    </td>
                  </tr>
                )
              }
              const state = items[row.itemId!] ?? { status: null, keterangan: '' }
              return (
                <tr key={row.itemId}>
                  <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center' }}>
                    {row.itemId}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '3px 6px' }}>{row.itemLabel}</td>
                  <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', fontWeight: 700, fontSize: '12px' }}>
                    {state.status === 'ADA' ? '√' : ''}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', fontWeight: 700, fontSize: '12px' }}>
                    {state.status === 'TIDAK_ADA' ? '√' : ''}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '3px 6px' }}>{state.keterangan}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* ── Opini ADK ── */}
        <div
          style={{
            border: '1px solid #000',
            padding: '8px 12px',
            marginBottom: '12px',
            minHeight: '60px',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '6px' }}>10. OPINI ADK</div>
          <div style={{ whiteSpace: 'pre-wrap', minHeight: '40px' }}>{checklist.opini ?? '-'}</div>
        </div>

        {/* ── Signature ── */}
        <div style={{ border: '1px solid #000', padding: '8px 12px' }}>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>
            11. Telah dicatat oleh ADK Kanca/Kanwil
          </div>
          <table style={{ borderCollapse: 'collapse', fontSize: '10px' }}>
            <tbody>
              {(
                [
                  ['Nama', adkName || '___________________________'],
                  ['Jabatan', 'ADK'],
                  ['Tanggal', printDate],
                ] as [string, string][]
              ).map(([label, value]) => (
                <tr key={label}>
                  <td style={{ paddingRight: '16px', paddingBottom: '4px', fontWeight: 600, width: '80px' }}>
                    {label}
                  </td>
                  <td style={{ paddingRight: '8px', paddingBottom: '4px', width: '12px' }}>:</td>
                  <td style={{ paddingBottom: '4px' }}>
                    {label === 'Nama' ? (
                      <span
                        style={{
                          display: 'inline-block',
                          borderBottom: '1px solid #000',
                          minWidth: '180px',
                          paddingBottom: '1px',
                        }}
                      >
                        {value}
                      </span>
                    ) : (
                      value
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Signature space */}
          <div style={{ marginTop: '40px', display: 'flex', gap: '80px' }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  borderBottom: '1px solid #000',
                  width: '160px',
                  marginBottom: '4px',
                  height: '40px',
                }}
              />
              <div style={{ fontSize: '9px' }}>(Tanda Tangan ADK)</div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            marginTop: '16px',
            textAlign: 'right',
            fontSize: '8px',
            color: '#666',
          }}
        >
          Dicetak dari BRISPOT — {new Date().toLocaleString('id-ID')}
        </div>
      </div>
    </>
  )
}
