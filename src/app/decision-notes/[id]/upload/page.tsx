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
        <Link href={`/decision-notes/${id}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Upload Bukti / Dokumen</h1>
          <p className="text-sm text-gray-500">Upload dokumen pendukung untuk DN ini</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <EvidenceUpload dnId={id} />
      </div>
    </div>
  )
}
