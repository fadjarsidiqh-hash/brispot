import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'
import { SessionGuard } from '@/components/SessionGuard'

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard>
      <div className="flex flex-col h-screen overflow-hidden">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-[#f0f4f8] p-4 lg:p-5">
            {children}
          </main>
        </div>
      </div>
    </SessionGuard>
  )
}
