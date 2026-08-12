'use client'

import { usePathname, useRouter } from 'next/navigation'
import { AdminBrandProvider, useAdminBrand } from './AdminBrandContext'
import { BrandLogo } from '@/app/components/BrandLogo'

const TABS = [
  { href: '/admin', label: 'Sellar' },
  { href: '/admin/tarjetas', label: 'Tarjetas' },
]

function AdminChrome({ children }: { children: React.ReactNode }) {
  const { logo, logoColor, logoBg, brandName, S, accentText } = useAdminBrand()
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/admin/login'
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: S.bg }}>
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 flex-wrap"
        style={{ backgroundColor: S.sidebar, borderBottom: `1px solid ${S.border}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0" style={{ backgroundColor: logoBg }}>
            <BrandLogo src={logo} color={logoColor} className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-sm" style={{ color: S.text }}>{brandName}</span>
        </div>
        <div className="flex items-center gap-2">
          {TABS.map(t => {
            const active = pathname === t.href
            return (
              <button key={t.href} onClick={() => router.push(t.href)}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                style={active
                  ? { backgroundColor: S.accent, color: accentText }
                  : { backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }}>
                {t.label}
              </button>
            )
          })}
          <button onClick={logout} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: S.sub, border: `1px solid ${S.border}` }}>
            Cerrar sesión
          </button>
        </div>
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
