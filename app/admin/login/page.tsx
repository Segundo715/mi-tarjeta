'use client'

import { useState, useEffect } from 'react'
import { BrandLogo } from '@/app/components/BrandLogo'

const STORAGE_KEY = 'admin_remembered_name'

function contrastText(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#000' : '#fff'
}

export default function AdminLoginPage() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [logo, setLogo] = useState('/logo.png')
  const [logoColor, setLogoColor] = useState('')
  const [accent, setAccent] = useState('#B90F45')
  const [brandName, setBrandName] = useState('Restaurante')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) queueMicrotask(() => setName(saved))
    fetch('/api/settings?key=menu_logo').then(r => r.json()).then(d => {
      if (d?.value) { setLogo(d.value); return }
      fetch('/api/settings?key=profile_logo').then(r => r.json()).then(d2 => { if (d2?.value) setLogo(d2.value) }).catch(() => {})
    }).catch(() => {})
    fetch('/api/settings?key=menu_logo_color').then(r => r.json()).then(d => setLogoColor(d?.value ?? '')).catch(() => {})
    fetch('/api/settings?key=menu_hover_color').then(r => r.json()).then(d => {
      if (d?.value) { setAccent(d.value); return }
      fetch('/api/settings?key=sidebar_accent').then(r => r.json()).then(d2 => { if (d2?.value) setAccent(d2.value) }).catch(() => {})
    }).catch(() => {})
    fetch('/api/settings?key=restaurant_name').then(r => r.json()).then(d => { if (d?.value) setBrandName(d.value) }).catch(() => {})
  }, [])

  const accentText = contrastText(accent)
  const INPUT = 'w-full rounded-2xl px-4 py-3.5 text-white text-sm transition-colors focus:outline-none'
  const inputStyle = { backgroundColor: '#0a0a0a', border: `1px solid ${accent}4d` }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim() || !password) { setError('Completa todos los campos'); return }
    localStorage.setItem(STORAGE_KEY, name.trim())
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), password }),
      })
      const data = await res.json()
      if (res.ok) window.location.href = '/admin'
      else setError(data.error ?? 'Error')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-5" style={{ backgroundColor: '#000' }}>
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
          <BrandLogo src={logo} color={logoColor} alt={brandName} className="w-full h-full object-contain" />
        </div>
        <div className="font-extrabold text-xl tracking-wide text-white">{brandName}</div>
        <p className="text-sm mt-1 font-medium" style={{ color: accent }}>Editor de tarjetas — acceso de administrador</p>
      </div>

      <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden" style={{ backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a' }}>
        <p className="text-sm font-black text-center pt-4 pb-1" style={{ color: accent }}>Iniciar sesión</p>
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#888' }}>Nombre completo</label>
            <input type="text" value={name} onChange={e => { setName(e.target.value); setError('') }}
              placeholder="Ej. Carlos López" autoComplete="name" autoFocus
              className={INPUT} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#888' }}>Contraseña</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Contraseña" autoComplete="current-password"
              className={INPUT} style={inputStyle} />
          </div>

          {error && (
            <div className="border rounded-2xl px-4 py-3 text-sm font-medium text-red-300"
              style={{ backgroundColor: '#2d0a0a', borderColor: '#7f1d1d' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full font-black py-4 rounded-2xl text-base disabled:opacity-60 transition-colors mt-1"
            style={{ backgroundColor: accent, color: accentText }}>
            {loading ? 'Cargando...' : '→ Entrar'}
          </button>
        </form>
      </div>

      <p className="text-xs mt-6" style={{ color: '#555' }}>Usa tu cuenta del panel de administración</p>
    </div>
  )
}
