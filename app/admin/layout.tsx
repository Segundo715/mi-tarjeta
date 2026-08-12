'use client'

import { usePathname } from 'next/navigation'
import { AdminBrandProvider, useAdminBrand } from './AdminBrandContext'
import { BrandLogo } from '@/app/components/BrandLogo'

function AdminChrome({ children }: { children: React.ReactNode }) {
  const { logo, logoColor, logoBg, brandName, S } = useAdminBrand()

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/admin/login'
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: S.bg }}>
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: S.sidebar, borderBottom: `1px solid ${S.border}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0" style={{ backgroundColor: logoBg }}>
            <BrandLogo src={logo} color={logoColor} className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-sm" style={{ color: S.text }}>{brandName}</span>
        </div>
        <button onClick={logout} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: S.sub, border: `1px solid ${S.border}` }}>
          Cerrar sesión
        </button>
      </div>

      <main>{children}</main>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/admin/login') return <>{children}</>

  return (
    <AdminBrandProvider>
      <AdminChrome>{children}</AdminChrome>
    </AdminBrandProvider>
  )
}
