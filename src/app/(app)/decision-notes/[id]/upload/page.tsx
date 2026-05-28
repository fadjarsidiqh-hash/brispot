'use client'

import { EvidenceUpload } from '@/components/forms/EvidenceUpload'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function UploadEvidencePage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href={`/decision-notes/${id}`} className="p-1.5 rounded-lg hover:bg-[#e8ecf4] text-[#718096] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-[15px] font-bold text-[#002470]">Upload Bukti / Dokumen</h1>
          <p className="text-[10px] text-[#9ca3af] mt-0.5">Upload dokumen pendukung untuk DN ini</p>
        </div>
      </div>
      <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-4">
        <EvidenceUpload dnId={id} />
      </div>
    </div>
  )
}
