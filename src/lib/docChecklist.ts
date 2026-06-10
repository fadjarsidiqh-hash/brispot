export type ChecklistStatus = 'ADA' | 'TIDAK_ADA' | null

export interface ChecklistItemState {
  status: ChecklistStatus
  keterangan: string
}

export interface ChecklistSection {
  id: string
  label: string
  items: { id: string; label: string }[]
}

export const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: 's1',
    label: '1. Surat Permohonan Kredit',
    items: [
      { id: '1', label: 'Surat Permohonan Kredit' },
    ],
  },
  {
    id: 's2',
    label: '2. Identitas Debitur',
    items: [
      { id: '2a', label: 'Copy bukti diri / KTP' },
      { id: '2b', label: 'Copy surat kewarganegaraan / surat keterangan ganti nama' },
      { id: '2c', label: 'Foto debitur' },
      { id: '2d', label: 'Identitas Lain' },
    ],
  },
  {
    id: 's3',
    label: '3. Identitas Usaha Debitur',
    items: [
      { id: '3a', label: 'Akta Pendirian Perusahaan / Perubahan' },
      { id: '3b', label: 'SIUP' },
      { id: '3c', label: 'SITU' },
      { id: '3d', label: 'TDP' },
      { id: '3e', label: 'SIUJIK' },
      { id: '3f', label: 'NPWP' },
      { id: '3g', label: 'Lainnya' },
    ],
  },
  {
    id: 's4',
    label: '4. Surat Hutang',
    items: [
      { id: '4a', label: 'Surat Hutang' },
      { id: '4b', label: 'Addendum Surat Hutang' },
    ],
  },
  {
    id: 's5',
    label: '5. Pengikatan Agunan',
    items: [
      { id: '5a', label: 'Sertifikat CV' },
      { id: '5b', label: 'Sertifikat Hipotik' },
      { id: '5c', label: 'Sertifikat HT' },
      { id: '5d', label: 'Fiducia' },
      { id: '5e', label: 'Gadai' },
      { id: '5f', label: 'Cessie' },
      { id: '5g', label: 'SKMHT' },
      { id: '5h', label: 'Personal / Corporate Guarantee' },
    ],
  },
  {
    id: 's6',
    label: '6. Bukti Kepemilikan Agunan',
    items: [
      { id: '6a', label: 'Hak Atas Tanah' },
      { id: '6b', label: 'Bilyet Deposito / Buku Tabungan' },
      { id: '6c', label: 'BPKB' },
      { id: '6d', label: 'Promissory notes / Commercial paper / Saham' },
      { id: '6e', label: 'Bank Garansi' },
      { id: '6f', label: 'Faktur / Kuitansi' },
      { id: '6g', label: 'Lainnya' },
    ],
  },
  {
    id: 's7',
    label: '7. Paket Kredit',
    items: [
      { id: '7a', label: 'MAK' },
      { id: '7b', label: 'LKN' },
      { id: '7c', label: 'Penilaian Agunan' },
      { id: '7d', label: 'Pemeriksaan Kelengkapan Paket' },
      { id: '7e', label: 'PTK' },
      { id: '7f', label: 'Offering Letter' },
      { id: '7g', label: 'PPND' },
      { id: '7h', label: 'IPK' },
      { id: '7i', label: 'Surat lainnya' },
    ],
  },
  {
    id: 's8',
    label: '8. Surat-surat Lainnya',
    items: [
      { id: '8a', label: 'Asuransi' },
      { id: '8b', label: 'Surat-surat lainnya' },
    ],
  },
  {
    id: 's9',
    label: '9. Pemeriksaan Agunan',
    items: [
      { id: '9a', label: 'Penilaian Tanah' },
      { id: '9b', label: 'Penilaian Tanah dan Bangunan' },
      { id: '9c', label: 'Lainnya' },
    ],
  },
]

export const ALL_ITEM_IDS = CHECKLIST_SECTIONS.flatMap((s) => s.items.map((i) => i.id))

export function emptyChecklist(): Record<string, ChecklistItemState> {
  const result: Record<string, ChecklistItemState> = {}
  for (const id of ALL_ITEM_IDS) {
    result[id] = { status: null, keterangan: '' }
  }
  return result
}
