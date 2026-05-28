import { DNForm } from '@/components/forms/DNForm'

export default function NewDNPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Buat Decision Note Baru</h1>
        <p className="text-sm text-gray-500">Isi formulir 5 langkah berikut untuk membuat DN baru</p>
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <DNForm />
      </div>
    </div>
  )
}
