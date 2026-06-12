'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { UploadCloud, X, FileText, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EvidenceUploadProps {
  dnId: string
  conditionId?: string
  onUploadComplete?: (fileUrl: string) => void
}

interface UploadedFile {
  id: string
  name: string
  size: number
  status: 'uploading' | 'done' | 'error'
  url?: string
  error?: string
}

export function EvidenceUpload({ dnId, conditionId, onUploadComplete }: EvidenceUploadProps) {
  const { user } = useAuth()
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])

  const uploadFile = async (file: File) => {
    if (!user) return
    const fileId = crypto.randomUUID()
    setFiles((prev) => [...prev, { id: fileId, name: file.name, size: file.size, status: 'uploading' }])

    const formData = new FormData()
    formData.append('file', file)
    formData.append('dnId', dnId)
    if (conditionId) formData.append('conditionId', conditionId)

    const res = await fetch('/api/upload/evidence', { method: 'POST', body: formData })
    const json = await res.json()

    if (!res.ok || json.error) {
      setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, status: 'error', error: json.error ?? 'Upload gagal' } : f))
      return
    }

    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, status: 'done', url: json.publicUrl } : f))
    onUploadComplete?.(json.publicUrl)
  }

  const handleFiles = useCallback((fileList: FileList) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    Array.from(fileList).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        setFiles((prev) => [...prev, { id: crypto.randomUUID(), name: file.name, size: file.size, status: 'error' as const, error: 'Ukuran file maks 10MB' }])
        return
      }
      if (!allowed.includes(file.type)) {
        setFiles((prev) => [...prev, { id: crypto.randomUUID(), name: file.name, size: file.size, status: 'error' as const, error: 'Format tidak didukung' }])
        return
      }
      uploadFile(file)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dnId, conditionId, user])

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files) }}
        className={cn(
          'border-2 border-dashed rounded-[10px] p-5 text-center transition-all cursor-pointer',
          isDragging ? 'border-[#003087] bg-[#f0f6ff]' : 'border-[#c8dff5] bg-[#f8fafc] hover:border-[#003087] hover:bg-[#f0f6ff]'
        )}
        onClick={() => document.getElementById('file-input-brimos')?.click()}
      >
        <UploadCloud className="w-7 h-7 mx-auto text-[#003087] mb-2" />
        <p className="text-[10px] font-semibold text-[#003087]">Drag &amp; drop atau klik untuk upload</p>
        <p className="text-[8px] text-[#9ca3af] mt-0.5">PDF, Word, Excel, JPG, PNG — maks 10MB</p>
        <input
          id="file-input-brimos"
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files) }}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg border ${
              f.status === 'error' ? 'bg-[#fff0f0] border-[#ffcdd2]' : 'bg-[#f0f7ff] border-[#c8dff5]'
            }`}>
              <FileText className="w-4 h-4 text-[#003087] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-[#002470] truncate">{f.name}</p>
                <p className="text-[8px] text-[#9ca3af]">{(f.size / 1024).toFixed(1)} KB</p>
                {f.error && <p className="text-[8px] text-red-500">{f.error}</p>}
              </div>
              {f.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
              {f.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {f.status === 'error' && <X className="w-4 h-4 text-red-500" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
