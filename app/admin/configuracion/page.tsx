'use client'

import { useState, useEffect } from 'react'
import { useAdminBrand } from '../AdminBrandContext'
import { uploadWebp } from '@/lib/uploadWebp'
import { BrandLogo } from '@/app/components/BrandLogo'

export default function AdminConfiguracionPage() {
  const { S, reload } = useAdminBrand()
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => {
    const keys = ['restaurant_name', 'restaurant_phone', 'menu_logo', 'profile_logo', 'menu_logo_color', 'menu_bg_color', 'menu_btn_color', 'menu_hover_color']
    keys.forEach(async key => {
      const r = await fetch(`/api/settings?key=${key}`)
      const d = await r.json()
      setValues(p => ({ ...p, [key]: d?.value ?? '' }))
    })
  }, [])

  async function saveSetting(key: string, valueOverride?: string) {
    const value = valueOverride ?? values[key] ?? ''
    setSaving(key)
    try {
      const r = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (r.ok) {
        setSaved(key)
        setTimeout(() => setSaved(null), 2500)
        reload()
      }
    } finally {
      setSaving(null)
    }
  }

  async function uploadLogo(file: File) {
    setUploadingLogo(true)
    try {
      const url = await uploadWebp(file, '/api/settings/upload')
      if (url) {
        setValues(p => ({ ...p, menu_logo: url }))
        await saveSetting('menu_logo', url)
      }
    } finally {
      setUploadingLogo(false)
    }
  }

  const renderSaveBtn = (k: string) => (
    <button
      onClick={() => saveSetting(k)}
      disabled={saving === k}
      className="px-4 py-2 rounded-2xl text-sm font-bold shrink-0 transition-all"
      style={{ backgroundColor: saved === k ? 'rgba(74,222,128,.2)' : `${S.accent}22`, color: saved === k ? '#4ade80' : S.accent }}>
      {saving === k ? '...' : saved === k ? '✓ Guardado' : 'Guardar'}
    </button>
  )

  const renderColorRow = (key: string, fallback: string) => (
    <div className="flex items-center gap-2">
      <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(values[key] || '') ? values[key] : fallback}
        onChange={e => setValues(p => ({ ...p, [key]: e.target.value }))}
        className="w-11 h-11 rounded-xl cursor-pointer bg-transparent shrink-0" style={{ border: `1px solid ${S.border}` }} />
      <input type="text" value={values[key] ?? ''}
        onChange={e => setValues(p => ({ ...p, [key]: e.target.value }))}
        placeholder={fallback}
        className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none font-mono"
        style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
      {renderSaveBtn(key)}
    </div>
  )

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="pt-1">
        <h1 className="text-xl font-black" style={{ color: S.text }}>Configuración</h1>
        <p className="text-xs mt-0.5" style={{ color: S.sub }}>Identidad del restaurante</p>
      </div>

      <div className="rounded-2xl p-5 space-y-5" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>

        {/* Nombre */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Nombre del restaurante</label>
          <div className="flex gap-2">
            <input type="text" value={values.restaurant_name ?? ''}
              onChange={e => setValues(p => ({ ...p, restaurant_name: e.target.value }))}
              className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
            {renderSaveBtn('restaurant_name')}
          </div>
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Teléfono</label>
          <div className="flex gap-2">
            <input type="text" value={values.restaurant_phone ?? ''}
              onChange={e => setValues(p => ({ ...p, restaurant_phone: e.target.value }))}
              placeholder="(444) 123-4567"
              className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
            {renderSaveBtn('restaurant_phone')}
          </div>
        </div>

        {/* Logo */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Logo del restaurante</label>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
              style={{ background: values.menu_bg_color || '#0d0d0d', border: `1px solid ${S.border}` }}>
              <BrandLogo src={values.menu_logo || values.profile_logo || '/logo.png'} color={values.menu_logo_color}
                alt="logo" className="w-10 h-10 object-contain" />
            </div>
            <label className="px-4 py-2 rounded-2xl text-sm font-bold cursor-pointer transition-all"
              style={{ backgroundColor: `${S.accent}22`, color: S.accent }}>
              {uploadingLogo ? 'Subiendo...' : 'Cambiar logo'}
              <input type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }} />
            </label>
          </div>
          <p className="text-xs mt-1" style={{ color: S.sub }}>Aparece en /admin y en la tarjeta que ven los clientes</p>

          <div className="mt-3">
            <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Recolorear logo (si tiene negro u otro color)</label>
            {renderColorRow('menu_logo_color', '#B90F45')}
            <p className="text-xs mt-1" style={{ color: S.sub }}>Reemplaza todo el logo por un solo tono, usando su forma como silueta. Funciona con logos de fondo transparente (PNG/WebP/SVG); no aplica a fotos o JPG.</p>
          </div>
        </div>

        {/* Fondo */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Color de fondo</label>
          {renderColorRow('menu_bg_color', '#0d0d0d')}
        </div>

        {/* Botón / tarjetas */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Color de botón / tarjetas</label>
          {renderColorRow('menu_btn_color', '#B90F45')}
        </div>

        {/* Acento */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Color de acento / hover</label>
          {renderColorRow('menu_hover_color', '#DC5E86')}
        </div>
      </div>

      <p className="text-xs" style={{ color: S.sub }}>
        Esta identidad (nombre, logo y colores) es la misma que usan mi-menu y mi-card —
        cambiarla aquí también se refleja allá, porque comparten la misma configuración.
      </p>
    </div>
  )
}
