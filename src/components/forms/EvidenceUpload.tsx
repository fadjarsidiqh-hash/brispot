'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  const supabase = createClient()
  const { user } = useAuth()
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])

  const uploadFile = async (file: File) => {
    if (!user) return
    const fileId = crypto.randomUUID()
    setFiles((prev) => [...prev, { id: fileId, name: file.name, size: file.size, status: 'uploading' }])

    const path = `evidences/${dnId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    const { data: storageData, error: storageErr } = await supabase.storage
      .from('brimos-evidence')
      .upload(path, file, { upsert: false })

    if (storageErr) {
      setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, status: 'error', error: storageErr.message } : f))
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('brimos-evidence').getPublicUrl(storageData.path)

    // Save record to DB
    await supabase.from('dn_evidences').insert({
      dn_id: dnId,
      condition_id: conditionId ?? null,
      file_name: file.name,
      file_path: storageData.path,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
    })

    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, status: 'done', url: publicUrl } : f))
    onUploadComplete?.(publicUrl)
  }

  const handleFiles = useCallback((fileList: FileList) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    Array.from(fileList).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        setFiles((prev) => [...prev, { name: file.name, size: file.size, status: 'error', error: 'Ukuran file maks 10MB' }])
        return
      }
      if (!allowed.includes(file.type)) {
        setFiles((prev) => [...prev, { name: file.name, size: file.size, status: 'error', error: 'Format tidak didukung' }])
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
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
          isDragging ? 'border-[#002D62] bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        )}
        onClick={() => document.getElementById('file-input-brimos')?.click()}
      >
        <UploadCloud className="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm font-medium text-gray-700">Drag & drop atau klik untuk upload</p>
        <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, JPG, PNG — maks 10MB</p>
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
            <div key={f.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
              <FileText className="w-5 h-5 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.name}</p>
                <p className="text-xs text-gray-400">{(f.size / 1024).toFixed(1)} KB</p>
                {f.error && <p className="text-xs text-red-500">{f.error}</p>}
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
