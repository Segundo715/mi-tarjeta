'use client'

import { useState, useEffect } from 'react'
import { useAdminBrand } from '../AdminBrandContext'
import { uploadWebp } from '@/lib/uploadWebp'
import { BrandLogo } from '@/app/components/BrandLogo'

const ROLES = ['Administrador', 'Gerente', 'Supervisor', 'Encargado', 'Cajero', 'Auditor']

interface AdminItem { id: string; name: string; role: string; createdAt: string }

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  const raw = Array.from(arr).map(b => chars[b % chars.length]).join('')
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`
}

function currentAdminName(): string {
  if (typeof document === 'undefined') return ''
  const m = document.cookie.match(/(?:^|;\s*)admin_name=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : ''
}

export default function AdminConfiguracionPage() {
  const { S, accentText, reload } = useAdminBrand()
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const [admins, setAdmins] = useState<AdminItem[]>([])
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('Administrador')
  const [newPass, setNewPass] = useState(() => generatePassword())
  const [passCopied, setPassCopied] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [creating, setCreating] = useState(false)

  const me = currentAdminName()

  useEffect(() => {
    const keys = ['restaurant_name', 'restaurant_phone', 'menu_logo', 'profile_logo', 'menu_logo_color', 'menu_logo_size', 'menu_bg_color', 'menu_btn_color', 'menu_hover_color']
    keys.forEach(async key => {
      const r = await fetch(`/api/settings?key=${key}`)
      const d = await r.json()
      setValues(p => ({ ...p, [key]: d?.value ?? '' }))
    })
    loadAdmins()
  }, [])

  async function loadAdmins() {
    const r = await fetch('/api/admins')
    if (!r.ok) return
    setAdmins(await r.json())
  }

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

  async function createProfile() {
    setProfileError('')
    if (!newName.trim()) { setProfileError('El nombre es requerido'); return }
    setCreating(true)
    try {
      const r = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), password: newPass, role: newRole }),
      })
      const d = await r.json()
      if (!r.ok) { setProfileError(d.error ?? 'Error al crear el perfil'); return }
      setNewName('')
      setNewRole('Administrador')
      setNewPass(generatePassword())
      setPassCopied(false)
      await loadAdmins()
    } finally {
      setCreating(false)
    }
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(newPass)
    setPassCopied(true)
    setTimeout(() => setPassCopied(false), 2500)
  }

  async function deleteProfile(id: string, name: string) {
    if (!confirm(`¿Eliminar el perfil "${name}"? Esta acción no se puede deshacer.`)) return
    setProfileError('')
    const r = await fetch(`/api/admins?id=${id}`, { method: 'DELETE' })
    if (!r.ok) {
      const d = await r.json()
      setProfileError(d.error ?? 'No se pudo eliminar')
      return
    }
    await loadAdmins()
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

        {/* Tamaño del logo */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Tamaño del logo (tarjeta del cliente)</label>
          <div className="flex items-center gap-3">
            <input type="range" min={60} max={280} step={10}
              value={Number(values.menu_logo_size) || 80}
              onChange={e => setValues(p => ({ ...p, menu_logo_size: e.target.value }))}
              className="flex-1" style={{ accentColor: S.accent }} />
            <span className="text-sm font-bold tabular-nums w-14 text-right" style={{ color: S.text }}>
              {Number(values.menu_logo_size) || 80}px
            </span>
            {renderSaveBtn('menu_logo_size')}
          </div>
          <p className="text-xs mt-1" style={{ color: S.sub }}>Tamaño del logo en las pantallas de carga, espera y "tarjeta no encontrada"</p>
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

      {/* ===== Administración de perfiles ===== */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
          <p className="font-bold text-sm" style={{ color: S.text }}>Administración de perfiles</p>
          <p className="text-xs mt-0.5" style={{ color: S.sub }}>Usuarios con acceso al panel /admin (compartidos con mi-menu/mi-card)</p>
        </div>
        <div className="p-5 space-y-4">

          <div className="space-y-2">
            {admins.map(a => {
              const isMe = a.name.toLowerCase() === me.toLowerCase()
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#4f6ef7)', color: '#fff' }}>
                    {a.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: S.text }}>
                      {a.name}{isMe && <span className="ml-2 text-xs font-medium" style={{ color: S.accent }}>(tú)</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${S.accent}22`, color: S.accent }}>
                        {a.role || 'Administrador'}
                      </span>
                      <span className="text-xs" style={{ color: S.sub }}>Alta: {new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button onClick={() => deleteProfile(a.id, a.name)} disabled={isMe}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'transparent' }}>
                    Eliminar
                  </button>
                </div>
              )
            })}
            {admins.length === 0 && (
              <p className="text-xs" style={{ color: S.sub }}>Cargando perfiles...</p>
            )}
          </div>

          <div className="pt-4 space-y-3" style={{ borderTop: `1px solid ${S.border}` }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: S.sub }}>Crear nuevo perfil</p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input type="text" value={newName}
                onChange={e => { setNewName(e.target.value); setProfileError('') }}
                placeholder="Nombre de usuario"
                className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none"
                style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
              <select value={newRole} onChange={e => setNewRole(e.target.value)}
                className="px-4 py-3 rounded-2xl text-sm outline-none font-medium"
                style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="rounded-2xl p-3 space-y-2" style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: S.sub }}>Contraseña generada automáticamente</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2.5 rounded-xl text-sm font-mono tracking-wider select-all"
                  style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }}>
                  {newPass}
                </code>
                <button onClick={copyPassword}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all"
                  style={{ backgroundColor: passCopied ? 'rgba(74,222,128,.2)' : `${S.accent}22`, color: passCopied ? '#4ade80' : S.accent }}>
                  {passCopied ? '✓ Copiada' : 'Copiar'}
                </button>
                <button onClick={() => { setNewPass(generatePassword()); setPassCopied(false) }}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all"
                  style={{ backgroundColor: `${S.accent}22`, color: S.accent }}>
                  Nueva
                </button>
              </div>
              <p className="text-xs" style={{ color: S.sub }}>
                Copia la contraseña antes de crear el perfil — no se puede recuperar después.
              </p>
            </div>

            <button onClick={createProfile} disabled={creating || !newName.trim()}
              className="w-full py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ backgroundColor: S.accent, color: accentText }}>
              {creating ? 'Creando...' : '+ Crear perfil'}
            </button>

            {profileError && (
              <p className="text-xs font-medium" style={{ color: '#f87171' }}>{profileError}</p>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
