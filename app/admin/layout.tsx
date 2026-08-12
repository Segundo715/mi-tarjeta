'use client'

import { usePathname, useRouter } from 'next/navigation'
import { AdminBrandProvider, useAdminBrand } from './AdminBrandContext'
import { Icon } from '@/app/components/Icon'
import { BrandLogo } from '@/app/components/BrandLogo'

const TABS = [
  { href: '/admin', label: 'Sellar', icon: 'coffee' as const },
  { href: '/admin/tarjetas', label: 'Tarjetas', icon: 'card' as const },
]

function AdminChrome({ children }: { children: React.ReactNode }) {
  const { logo, logoColor, logoBg, brandName, adminName, S, accentText } = useAdminBrand()
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/admin/login'
  }

  const navItem = (t: typeof TABS[number]) => {
    const active = pathname === t.href
    return (
      <button key={t.href} onClick={() => router.push(t.href)}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={active
          ? { backgroundColor: S.accent, color: accentText }
          : { color: S.sub }}>
        <Icon name={t.icon} size={18} />
        {t.label}
      </button>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: S.bg }}>
      {/* ===== Sidebar desktop ===== */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 w-[240px]"
        style={{ backgroundColor: S.sidebar, borderRight: `1px solid ${S.border}` }}>
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: logoBg }}>
            <BrandLogo src={logo} color={logoColor} alt={brandName} className="w-full h-full object-contain" />
          </div>
          <div className="font-extrabold text-base" style={{ color: S.text }}>{brandName}</div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {TABS.map(navItem)}
        </nav>

        <div className="p-3" style={{ borderTop: `1px solid ${S.border}` }}>
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 text-white"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f6ef7)' }}>
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: S.text }}>{adminName}</div>
              <div className="text-xs" style={{ color: S.sub }}>Sellar visitas</div>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ color: S.sub }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ===== Topbar mobile ===== */}
      <div className="md:hidden sticky top-0 z-30" style={{ backgroundColor: S.sidebar, borderBottom: `1px solid ${S.border}` }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: logoBg }}>
              <BrandLogo src={logo} color={logoColor} alt={brandName} className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-sm" style={{ color: S.text }}>{brandName}</span>
          </div>
          <button onClick={logout} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: S.sub, border: `1px solid ${S.border}` }}>
            Salir
          </button>
        </div>
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {TABS.map(t => {
            const active = pathname === t.href
            return (
              <button key={t.href} onClick={() => router.push(t.href)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5"
                style={active ? { backgroundColor: S.accent, color: accentText } : { backgroundColor: S.bg, color: S.sub, border: `1px solid ${S.border}` }}>
                <Icon name={t.icon} size={13} />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <main className="md:ml-[240px]">
        {children}
      </main>
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
