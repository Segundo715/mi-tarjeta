'use client'

import { createContext, useContext, useEffect, useState } from 'react'

function contrastText(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#000' : '#fff'
}

interface AdminBrand {
  logo: string
  logoColor: string
  logoBg: string
  brandName: string
  adminName: string
  accentHex: string
  loaded: boolean
  reload: () => void
  S: { bg: string; sidebar: string; card: string; accent: string; text: string; sub: string; border: string }
  accentText: string
}

const AdminBrandContext = createContext<AdminBrand | null>(null)

export function useAdminBrand(): AdminBrand {
  const ctx = useContext(AdminBrandContext)
  if (!ctx) throw new Error('useAdminBrand debe usarse dentro de AdminBrandProvider')
  return ctx
}

export function AdminBrandProvider({ children }: { children: React.ReactNode }) {
  const [logo, setLogo] = useState('/logo.png')
  const [logoColor, setLogoColor] = useState('')
  const [logoBg, setLogoBg] = useState('#0d0d0d')
  const [brandName, setBrandName] = useState('Restaurante')
  const [adminName, setAdminName] = useState('Administrador')
  const [accentHex, setAccentHex] = useState('#B90F45')
  const [loaded, setLoaded] = useState(false)

  function load() {
    fetch('/api/settings?key=menu_logo').then(r => r.json()).then(d => {
      if (d?.value) { setLogo(d.value); return }
      fetch('/api/settings?key=profile_logo').then(r => r.json()).then(d2 => { if (d2?.value) setLogo(d2.value) }).catch(() => {})
    }).catch(() => {})
    fetch('/api/settings?key=menu_logo_color').then(r => r.json()).then(d => setLogoColor(d?.value ?? '')).catch(() => {})
    fetch('/api/settings?key=menu_bg_color').then(r => r.json()).then(d => { if (d?.value) setLogoBg(d.value) }).catch(() => {})
    fetch('/api/settings?key=menu_hover_color').then(r => r.json()).then(d => {
      if (d?.value) { setAccentHex(d.value); return }
      fetch('/api/settings?key=sidebar_accent').then(r => r.json()).then(d2 => { if (d2?.value) setAccentHex(d2.value) }).catch(() => {})
    }).catch(() => {})
    fetch('/api/settings?key=restaurant_name').then(r => r.json()).then(d => { if (d?.value) setBrandName(d.value) }).finally(() => setLoaded(true)).catch(() => setLoaded(true))
    const match = document.cookie.split('; ').find(r => r.startsWith('admin_name='))
    if (match) setAdminName(decodeURIComponent(match.split('=')[1]))
  }

  useEffect(() => { load() }, [])

  const accentText = contrastText(accentHex)
  const S = {
    bg: '#f3f5fb', sidebar: '#ffffff', card: '#ffffff', accent: accentHex,
    text: '#0d1426', sub: '#5b6884', border: 'rgba(13,20,38,0.08)',
  }

  return (
    <AdminBrandContext.Provider value={{ logo, logoColor, logoBg, brandName, adminName, accentHex, loaded, reload: load, S, accentText }}>
      {children}
    </AdminBrandContext.Provider>
  )
}
