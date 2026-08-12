'use client'

// Editor de las categorías de reward (café, 2x1, descuento, premium...) que
// consume el visor público (/?id=). Se persiste en settings (reward_categories)
// — mismo formato que usan mi-menu y mi-card. Solo edita el diseño de las
// categorías; no gestiona tarjetas de clientes individuales (eso vive en mi-card).
import { useState, useEffect } from 'react'
import { useAdminBrand } from './AdminBrandContext'
import { Icon } from '@/app/components/Icon'
import { RewardIcon, REWARD_ICON_KEYS, isCustomIcon } from '@/app/components/RewardIcon'
import { uploadWebp } from '@/lib/uploadWebp'

interface RewardCategory {
  id: string; name: string; reward: string; goal: number; icon: string; color: string
  iconColor?: string; image?: string; brandText?: string; brandLogo?: string
  perks?: string[]
  validityMonths?: number
  lastChangedBy?: string; lastChangedAt?: string
}

interface LoyaltyCard {
  id: string; name: string; phone: string; visits: number
  active: boolean; cardType: string; expiresAt?: string; registeredAt: string
  stamps: { timestamp: string; visitsAfter: number }[]
}

function daysLeft(iso?: string) {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function lastVisit(card: LoyaltyCard) {
  const last = card.stamps.at(-1)?.timestamp ?? card.registeredAt
  return Math.floor((Date.now() - new Date(last).getTime()) / 86400000)
}

function timeAgo(days: number) {
  if (days === 0) return 'hoy'
  if (days === 1) return 'hace 1 día'
  if (days < 30) return `hace ${days} días`
  if (days < 60) return 'hace 1 mes'
  return `hace ${Math.floor(days / 30)} meses`
}

// "Vence este mes" = aún no vencida pero su fecha de vencimiento cae en el
// mes calendario actual — para avisarle al cliente antes de que se le venza.
function expiresThisMonth(card: LoyaltyCard): boolean {
  if (!card.expiresAt) return false
  const exp = new Date(card.expiresAt)
  const now = new Date()
  return exp.getFullYear() === now.getFullYear() && exp.getMonth() === now.getMonth() && exp.getTime() >= now.getTime()
}

const CATEGORIES_KEY = 'reward_categories'

function contrastText(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#000' : '#fff'
}

// El primer color de la paleta es el acento configurado en Identidad del
// restaurante, no un guinda fijo — así "Tarjeta de Café" nace con tu color.
function getColorPresets(accent: string): string[] {
  return [accent, '#00e676', '#fb923c', '#f87171', '#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#34d399']
}

const PERK_GROUPS: { label: string; items: string[] }[] = [
  { label: 'Upgrade', items: ['Tamaño grande gratis', 'Extra incluido', 'Servicio mejorado'] },
  { label: 'Complementos sin costo', items: ['Bebida gratis', 'Postre gratis', 'Extra de ingrediente'] },
]

// "Tarjeta de Café" usa el acento configurado en vez de un color fijo — las
// otras 3 conservan colores propios para diferenciar cada tipo de promoción.
function getDefaultCategories(accent: string): RewardCategory[] {
  return [
    { id: 'cafe',      name: 'Tarjeta de Café',   reward: 'Café gratis',             goal: 5, icon: 'coffee',  color: accent,     iconColor: contrastText(accent), validityMonths: 3 },
    { id: 'dosxuno',   name: 'Tarjeta 2x1',       reward: 'Segundo producto gratis', goal: 4, icon: 'gift',    color: '#60a5fa', iconColor: '#ffffff', validityMonths: 5 },
    { id: 'descuento', name: 'Descuento Directo', reward: '20% de descuento',        goal: 3, icon: 'percent', color: '#fb923c', iconColor: '#ffffff', validityMonths: 3 },
    { id: 'premium',   name: 'Upgrade Premium',   reward: 'Beneficios premium',      goal: 1, icon: 'crown',   color: '#fbbf24', iconColor: '#000000', validityMonths: 12, perks: ['Tamaño grande gratis', 'Bebida gratis'] },
  ]
}

const VALIDITY_PRESETS = [1, 2, 3, 5, 6, 12]

function emptyDraft(accent: string): RewardCategory {
  return { id: '', name: '', reward: '', goal: 5, icon: REWARD_ICON_KEYS[0], color: accent, iconColor: contrastText(accent), image: '', brandText: '', brandLogo: '', perks: [], validityMonths: 3 }
}

export default function AdminTarjetasPage() {
  const { S, accentText, accentHex, loaded } = useAdminBrand()
  const [cards, setCards] = useState<LoyaltyCard[]>([])
  const [loadingCards, setLoadingCards] = useState(true)
  const [filter, setFilter] = useState<'todas' | 'activas' | 'inactivas' | 'vencidas' | 'vencen_mes'>('todas')
  const [categoryFilter, setCategoryFilter] = useState<string>('todas')
  const [inactiveDays, setInactiveDays] = useState(30)
  const [categories, setCategories] = useState<RewardCategory[]>(getDefaultCategories(accentHex))
  const [draft, setDraft] = useState<RewardCategory>({ ...getDefaultCategories(accentHex)[0] })
  const [activeId, setActiveId] = useState<string | null>('cafe')
  const [savingCats, setSavingCats] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [uploading, setUploading] = useState<'image' | 'icon' | 'brandLogo' | null>(null)
  const [adminName, setAdminName] = useState('')
  const [catsOpen, setCatsOpen] = useState(false)

  useEffect(() => {
    const match = document.cookie.split('; ').find(r => r.startsWith('admin_name='))
    if (match) queueMicrotask(() => setAdminName(decodeURIComponent(match.split('=')[1])))
  }, [])

  async function load() {
    const r = await fetch('/api/loyalty')
    if (r.ok) setCards(await r.json())
    setLoadingCards(false)
  }

  useEffect(() => { queueMicrotask(load) }, [])

  // Espera a que se resuelva el acento real antes de armar los defaults, para
  // que "Tarjeta de Café" no nazca en guinda y luego cambie de golpe.
  useEffect(() => {
    if (loaded) loadCategories()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  async function loadCategories() {
    const defaults = getDefaultCategories(accentHex)
    try {
      const r = await fetch(`/api/settings?key=${CATEGORIES_KEY}`)
      const d = await r.json()
      const parsed = d.value ? JSON.parse(d.value) : null
      if (Array.isArray(parsed) && parsed.length) {
        const ids = new Set(parsed.map((c: RewardCategory) => c.id))
        const merged = [...parsed, ...defaults.filter(c => !ids.has(c.id))]
        setCategories(merged)
        setActiveId(merged[0].id)
        setDraft({ ...merged[0] })
      } else {
        setCategories(defaults)
        setActiveId(defaults[0].id)
        setDraft({ ...defaults[0] })
      }
    } catch {
      setCategories(defaults)
      setActiveId(defaults[0].id)
      setDraft({ ...defaults[0] })
    }
  }

  async function persistCategories(next: RewardCategory[]) {
    setCategories(next)
    setSavingCats(true)
    setSavedOk(false)
    setSaveError('')
    try {
      const r = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: CATEGORIES_KEY, value: JSON.stringify(next) }),
      })
      if (r.ok) {
        setSavedOk(true)
        setTimeout(() => setSavedOk(false), 3000)
      } else {
        setSaveError('No se pudo guardar. Intenta de nuevo.')
      }
    } catch {
      setSaveError('Error de conexión.')
    } finally {
      setSavingCats(false)
    }
  }

  function selectCategory(c: RewardCategory) {
    setActiveId(c.id)
    setDraft({ ...c })
  }

  function newCategory() {
    setActiveId(null)
    setDraft(emptyDraft(accentHex))
  }

  function togglePerk(perk: string) {
    setDraft(d => {
      const current = d.perks ?? []
      const next = current.includes(perk) ? current.filter(p => p !== perk) : [...current, perk]
      return { ...d, perks: next }
    })
  }

  async function uploadImage(field: 'image' | 'icon' | 'brandLogo', file: File) {
    setUploading(field)
    try {
      const url = await uploadWebp(file, '/api/settings/upload')
      if (url) setDraft(prev => ({ ...prev, [field]: url }))
    } finally {
      setUploading(null)
    }
  }

  async function saveCategory() {
    const name = draft.name.trim()
    const reward = draft.reward.trim()
    if (!name || !reward) return
    const goal = Math.max(1, Math.round(draft.goal) || 1)
    const validityMonths = Math.max(1, draft.validityMonths ?? 3)
    const audit = { lastChangedBy: adminName || 'Administrador', lastChangedAt: new Date().toISOString() }
    if (activeId) {
      await persistCategories(categories.map(c =>
        c.id === activeId ? { ...draft, id: activeId, name, reward, goal, validityMonths, ...audit } : c
      ))
    } else {
      const id = crypto.randomUUID()
      await persistCategories([...categories, { ...draft, id, name, reward, goal, validityMonths, ...audit }])
      setActiveId(id)
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm('¿Eliminar esta categoría de reward?')) return
    const next = categories.filter(c => c.id !== id)
    await persistCategories(next)
    if (next.length) selectCategory(next[0])
    else newCategory()
  }

  async function toggleCard(card: LoyaltyCard) {
    const action = card.active ? 'deactivate' : 'activate'
    await fetch(`/api/loyalty/${card.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    load()
  }

  async function deleteCard(id: string) {
    if (!confirm('¿Eliminar esta tarjeta?')) return
    await fetch(`/api/loyalty/${id}`, { method: 'DELETE' })
    load()
  }

  async function deactivateInactive() {
    const inactive = cards.filter(c => c.active && lastVisit(c) >= inactiveDays)
    if (inactive.length === 0) { alert('No hay tarjetas inactivas con ese plazo.'); return }
    if (!confirm(`¿Desactivar ${inactive.length} tarjeta(s) sin visita en ${inactiveDays} días?`)) return
    await Promise.all(inactive.map(c =>
      fetch(`/api/loyalty/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deactivate' }) })
    ))
    load()
  }

  // Filtrar primero por categoría (café / 2x1 / ...) para saber qué clientes
  // tienen cada tarjeta específica, luego por estado.
  const categoryScoped = categoryFilter === 'todas'
    ? cards
    : cards.filter(c => (c.cardType ?? 'cafe') === categoryFilter)

  const filtered = categoryScoped.filter(c => {
    const days = daysLeft(c.expiresAt)
    if (filter === 'activas') return c.active
    if (filter === 'inactivas') return !c.active
    if (filter === 'vencidas') return days !== null && days <= 0
    if (filter === 'vencen_mes') return expiresThisMonth(c)
    return true
  })

  const stats = {
    total: categoryScoped.length,
    activas: categoryScoped.filter(c => c.active).length,
    inactivas: categoryScoped.filter(c => !c.active).length,
    vencidas: categoryScoped.filter(c => { const d = daysLeft(c.expiresAt); return d !== null && d <= 0 }).length,
    vencenMes: categoryScoped.filter(expiresThisMonth).length,
  }

  return (
    <div className="max-w-[1100px] mx-auto p-4 space-y-4">
      <div className="pt-1">
        <h1 className="text-xl font-black" style={{ color: S.text }}>Tarjetas de fidelización</h1>
        <p className="text-xs mt-0.5" style={{ color: S.sub }}>Personaliza café, 2x1, descuento y premium</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: S.accent },
          { label: 'Activas', value: stats.activas, color: '#4ade80' },
          { label: 'Inactivas', value: stats.inactivas, color: '#f87171' },
          { label: 'Vencidas', value: stats.vencidas, color: '#fb923c' },
          { label: 'Vencen este mes', value: stats.vencenMes, color: '#facc15' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 text-center" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: S.sub }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
        <button
          onClick={() => setCatsOpen(o => !o)}
          className="w-full px-5 py-4 flex items-center justify-between gap-2 text-left transition-all"
          style={{ borderBottom: catsOpen ? `1px solid ${S.border}` : 'none' }}>
          <div>
            <p className="font-bold text-sm" style={{ color: S.text }}>Categorías de tarjetas</p>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>Café, 2x1, descuento, premium y las que crees — toca para personalizar</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {savingCats && <span className="text-xs" style={{ color: S.sub }}>Guardando…</span>}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: S.sub, transform: catsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>

        {catsOpen && <div>
        {/* Pestañas / módulos */}
        <div className="px-5 pt-5 pb-2 flex gap-2 flex-wrap items-center">
          {categories.map(c => {
            const active = activeId === c.id
            return (
              <button key={c.id} onClick={() => selectCategory(c)}
                className="px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all"
                style={active
                  ? { backgroundColor: c.color, color: contrastText(c.color) }
                  : { backgroundColor: S.bg, color: S.sub, border: `1px solid ${S.border}` }}>
                <RewardIcon name={c.icon} size={18} />
                {c.name}
              </button>
            )
          })}
          <button onClick={newCategory}
            className="px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
            style={activeId === null
              ? { backgroundColor: S.accent, color: accentText }
              : { backgroundColor: S.bg, color: S.accent, border: `1px dashed ${S.accent}` }}>
            + Nueva
          </button>
        </div>

        {/* Editor */}
        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: S.sub }}>Texto del tipo</label>
              <input type="text" value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="Tarjeta de Café"
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: S.sub }}>Premio</label>
              <input type="text" value={draft.reward}
                onChange={e => setDraft(d => ({ ...d, reward: e.target.value }))}
                placeholder="Café gratis"
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: S.sub }}>Sellos para el premio</label>
              <input type="number" min={1} value={draft.goal}
                onChange={e => setDraft(d => ({ ...d, goal: Number(e.target.value) }))}
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: S.sub }}>Vigencia de la tarjeta</label>
              <div className="flex gap-1.5 flex-wrap">
                {VALIDITY_PRESETS.map(m => (
                  <button key={m} onClick={() => setDraft(d => ({ ...d, validityMonths: m }))}
                    className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    style={(draft.validityMonths ?? 3) === m
                      ? { backgroundColor: draft.color, color: contrastText(draft.color) }
                      : { backgroundColor: S.bg, color: S.sub, border: `1px solid ${S.border}` }}>
                    {m === 1 ? '1 mes' : `${m} meses`}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-1.5" style={{ color: S.sub }}>
                El cliente tiene <span className="font-bold" style={{ color: S.text }}>{draft.validityMonths ?? 3} {(draft.validityMonths ?? 3) === 1 ? 'mes' : 'meses'}</span> para completar {draft.goal} sello{draft.goal !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {activeId === 'premium' && (
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: S.sub }}>Beneficios incluidos</label>
              <p className="text-xs mb-2" style={{ color: S.sub }}>Elige qué beneficios incluye la versión Premium</p>
              <div className="space-y-3">
                {PERK_GROUPS.map(group => (
                  <div key={group.label}>
                    <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: draft.color }}>{group.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map(item => {
                        const on = (draft.perks ?? []).includes(item)
                        return (
                          <button key={item} onClick={() => togglePerk(item)}
                            className="px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5"
                            style={on
                              ? { backgroundColor: draft.color, color: draft.iconColor || '#000' }
                              : { backgroundColor: S.bg, color: S.sub, border: `1px solid ${S.border}` }}>
                            <Icon name={on ? 'check' : 'plus'} size={13} />{item}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: S.sub }}>Ícono</label>
            <div className="flex gap-1.5 flex-wrap items-center">
              {REWARD_ICON_KEYS.map(ic => {
                const sel = draft.icon === ic
                return (
                  <button key={ic} onClick={() => setDraft(d => ({ ...d, icon: ic }))}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                    style={{ backgroundColor: S.bg, color: sel ? (draft.iconColor || draft.color) : S.sub, border: `1px solid ${sel ? draft.color : S.border}` }}>
                    <RewardIcon name={ic} size={20} />
                  </button>
                )
              })}
              <label title="Subir ícono propio"
                className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden transition-all"
                style={{ backgroundColor: S.bg, color: S.accent,
                  border: `1px ${isCustomIcon(draft.icon) ? 'solid' : 'dashed'} ${isCustomIcon(draft.icon) ? draft.color : S.accent}` }}>
                {isCustomIcon(draft.icon)
                  ? <RewardIcon name={draft.icon} size={24} />
                  : <span className="text-lg leading-none">{uploading === 'icon' ? '…' : '+'}</span>}
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage('icon', f) }} />
              </label>
            </div>
            <p className="text-xs mt-1" style={{ color: S.sub }}>Elige uno o sube tu propio ícono (PNG/SVG)</p>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: S.sub }}>Color del ícono</label>
            {isCustomIcon(draft.icon) ? (
              <p className="text-xs" style={{ color: S.sub }}>Los íconos subidos conservan su color original.</p>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <input type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(draft.iconColor || '') ? draft.iconColor : '#ffffff'}
                  onChange={e => setDraft(d => ({ ...d, iconColor: e.target.value }))}
                  className="w-11 h-10 rounded-xl cursor-pointer bg-transparent" style={{ border: `1px solid ${S.border}` }} />
                <input type="text" value={draft.iconColor || ''}
                  onChange={e => setDraft(d => ({ ...d, iconColor: e.target.value }))}
                  placeholder="#ffffff"
                  className="w-28 px-3 py-2 rounded-xl text-sm outline-none font-mono"
                  style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
                {['#ffffff', '#000000', draft.color].map((col, i) => (
                  <button key={i} onClick={() => setDraft(d => ({ ...d, iconColor: col }))}
                    className="w-7 h-7 rounded-full transition-all"
                    style={{ backgroundColor: col, border: `1px solid ${S.border}`, outline: draft.iconColor === col ? `2px solid ${S.text}` : 'none', outlineOffset: '2px' }} />
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: S.sub }}>Color de la tarjeta</label>
            <div className="flex gap-1.5 flex-wrap items-center">
              {getColorPresets(accentHex).map(col => (
                <button key={col} onClick={() => setDraft(d => ({ ...d, color: col }))}
                  className="w-8 h-8 rounded-full transition-all"
                  style={{ backgroundColor: col, outline: draft.color === col ? `2px solid ${S.text}` : 'none', outlineOffset: '2px' }} />
              ))}
              <input type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(draft.color) ? draft.color : '#000000'}
                onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
                title="Color personalizado"
                className="w-9 h-9 rounded-full cursor-pointer bg-transparent" style={{ border: `1px solid ${S.border}` }} />
              <input type="text" value={draft.color}
                onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
                placeholder="#B90F45"
                className="w-28 px-3 py-2 rounded-xl text-sm outline-none font-mono"
                style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: S.sub }}>Imagen de fondo</label>
            <div className="flex items-center gap-3">
              <div className="w-20 h-14 rounded-xl overflow-hidden shrink-0" style={{ border: `1px solid ${S.border}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={draft.image || '/uploads/menu/SalmonBowl.jpeg'} alt="imagen" className="w-full h-full object-cover" />
              </div>
              <label className="px-4 py-2 rounded-2xl text-sm font-bold cursor-pointer transition-all"
                style={{ backgroundColor: `${S.accent}22`, color: S.accent }}>
                {uploading === 'image' ? 'Subiendo...' : 'Cambiar imagen'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage('image', f) }} />
              </label>
            </div>
            <p className="text-xs mt-1" style={{ color: S.sub }}>Se ve detrás de los sellos en la tarjeta</p>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: S.sub }}>Marca en la tarjeta</label>
            {draft.brandLogo ? (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="h-12 px-3 rounded-xl flex items-center shrink-0" style={{ backgroundColor: draft.color }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={draft.brandLogo} alt="marca" className="h-7 w-auto object-contain" />
                </div>
                <label className="px-4 py-2 rounded-2xl text-sm font-bold cursor-pointer"
                  style={{ backgroundColor: `${S.accent}22`, color: S.accent }}>
                  {uploading === 'brandLogo' ? 'Subiendo...' : 'Cambiar logo'}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage('brandLogo', f) }} />
                </label>
                <button onClick={() => setDraft(d => ({ ...d, brandLogo: '' }))}
                  className="px-4 py-2 rounded-2xl text-sm font-bold"
                  style={{ backgroundColor: 'rgba(239,68,68,.08)', color: '#f87171' }}>Quitar logo</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <input type="text" value={draft.brandText || ''}
                  onChange={e => setDraft(d => ({ ...d, brandText: e.target.value }))}
                  placeholder="Deja vacío para usar el nombre del restaurante"
                  className="flex-1 min-w-[160px] px-4 py-3 rounded-2xl text-sm outline-none"
                  style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
                <span className="text-xs" style={{ color: S.sub }}>o</span>
                <label className="px-4 py-2 rounded-2xl text-sm font-bold cursor-pointer"
                  style={{ backgroundColor: `${S.accent}22`, color: S.accent }}>
                  {uploading === 'brandLogo' ? 'Subiendo...' : 'Subir logo de marca'}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage('brandLogo', f) }} />
                </label>
              </div>
            )}
            <p className="text-xs mt-1" style={{ color: S.sub }}>Texto o logo que aparece arriba a la derecha de la tarjeta</p>
          </div>

          {/* Vista previa */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ backgroundColor: S.bg, border: `1px solid ${draft.color}` }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
              style={{ backgroundColor: draft.color, color: isCustomIcon(draft.icon) ? undefined : (draft.iconColor || '#fff') }}>
              <RewardIcon name={draft.icon} size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-sm" style={{ color: S.text }}>{draft.name || 'Nombre del tipo'}</p>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: `${draft.color}1f`, color: draft.color }}>{Math.max(1, draft.goal || 1)} sellos</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: 'rgba(148,163,184,.12)', color: S.sub }}>
                  {draft.validityMonths ?? 3} {(draft.validityMonths ?? 3) === 1 ? 'mes' : 'meses'}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: S.sub }}>Premio: {draft.reward || '—'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button onClick={saveCategory}
              disabled={!draft.name.trim() || !draft.reward.trim() || savingCats}
              className="px-4 py-2 rounded-2xl text-sm font-bold transition-all disabled:opacity-40"
              style={{ backgroundColor: S.accent, color: accentText }}>
              {savingCats ? 'Guardando…' : activeId ? 'Guardar cambios' : '+ Crear categoría'}
            </button>
            {activeId && (
              <button onClick={() => deleteCategory(activeId)}
                className="px-4 py-2 rounded-2xl text-sm font-bold"
                style={{ backgroundColor: 'rgba(239,68,68,.08)', color: '#f87171' }}>
                Eliminar
              </button>
            )}
            {savedOk && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl"
                style={{ backgroundColor: 'rgba(74,222,128,.15)', color: '#4ade80' }}>
                ✓ ¡Cambios guardados!
              </span>
            )}
            {saveError && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl"
                style={{ backgroundColor: 'rgba(239,68,68,.12)', color: '#f87171' }}>
                {saveError}
              </span>
            )}
            <div className="ml-auto text-right">
              {draft.lastChangedAt ? (
                <p className="text-xs" style={{ color: S.sub }}>
                  Modificado por <span className="font-bold" style={{ color: S.text }}>{draft.lastChangedBy ?? 'Administrador'}</span>
                  <br />{new Date(draft.lastChangedAt).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              ) : adminName ? (
                <p className="text-xs" style={{ color: S.sub }}>
                  Sesión activa: <span className="font-bold" style={{ color: S.text }}>{adminName}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
        </div>}
      </div>

      {/* Desactivar inactivos */}
      <div className="rounded-2xl p-4 flex flex-wrap items-center gap-3" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
        <p className="text-sm font-bold flex-1" style={{ color: S.text }}>Desactivar sin visita en:</p>
        <select value={inactiveDays} onChange={e => setInactiveDays(Number(e.target.value))}
          className="px-3 py-2 rounded-xl text-sm font-bold outline-none"
          style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }}>
          {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} días</option>)}
        </select>
        <button onClick={deactivateInactive}
          className="px-4 py-2 rounded-xl text-sm font-bold"
          style={{ backgroundColor: 'rgba(239,68,68,.15)', color: '#f87171' }}>
          Desactivar inactivas
        </button>
      </div>

      {/* Filtro por categoría — para ver qué clientes tienen cada tarjeta específica */}
      <div className="space-y-1.5">
        <p className="text-xs font-bold" style={{ color: S.sub }}>Filtrar por categoría</p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCategoryFilter('todas')}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={categoryFilter === 'todas'
              ? { backgroundColor: S.accent, color: accentText }
              : { backgroundColor: S.card, color: S.sub, border: `1px solid ${S.border}` }}>
            Todas las categorías
          </button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setCategoryFilter(c.id)}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              style={categoryFilter === c.id
                ? { backgroundColor: c.color, color: contrastText(c.color) }
                : { backgroundColor: S.card, color: S.sub, border: `1px solid ${S.border}` }}>
              <RewardIcon name={c.icon} size={13} /> {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros por estado */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'todas', label: 'Todas' },
          { id: 'activas', label: 'Activas' },
          { id: 'inactivas', label: 'Inactivas' },
          { id: 'vencidas', label: 'Vencidas' },
          { id: 'vencen_mes', label: 'Vencen este mes' },
        ] as const).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={filter === f.id
              ? { backgroundColor: S.accent, color: accentText }
              : { backgroundColor: S.card, color: S.sub, border: `1px solid ${S.border}` }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loadingCards ? (
        <div className="text-center py-12 text-sm" style={{ color: S.sub }}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm rounded-2xl" style={{ color: S.sub, backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          No hay tarjetas en este filtro
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(card => {
            const days = daysLeft(card.expiresAt)
            const sinVisita = lastVisit(card)
            const expired = days !== null && days <= 0
            const cat = categories.find(c => c.id === (card.cardType ?? 'cafe'))
            return (
              <div key={card.id} className="rounded-2xl p-4 flex flex-wrap items-center gap-3"
                style={{ backgroundColor: S.card, border: `1px solid ${expired ? 'rgba(251,146,60,.3)' : !card.active ? 'rgba(239,68,68,.2)' : S.border}` }}>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                  style={{ backgroundColor: card.active ? `${S.accent}22` : 'rgba(239,68,68,.15)', color: card.active ? S.accent : '#f87171' }}>
                  {card.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm" style={{ color: S.text }}>{card.name}</p>
                    {cat && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                        style={{ backgroundColor: `${cat.color}22`, color: cat.color }}>
                        <RewardIcon name={cat.icon} size={11} /> {cat.name}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={card.active
                        ? { backgroundColor: 'rgba(0,230,118,.12)', color: '#4ade80' }
                        : { backgroundColor: 'rgba(239,68,68,.12)', color: '#f87171' }}>
                      {card.active ? 'Activa' : 'Inactiva'}
                    </span>
                    {expired && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: 'rgba(251,146,60,.12)', color: '#fb923c' }}>Vencida</span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-0.5 flex-wrap">
                    <p className="text-xs flex items-center gap-1" style={{ color: S.sub }}><Icon name="phone" size={12} /> {card.phone}</p>
                    <p className="text-xs" style={{ color: S.sub }}>Sellos: {card.visits}/{cat?.goal ?? 5}</p>
                    <p className="text-xs" style={{ color: sinVisita > 30 ? '#fb923c' : S.sub }}>
                      Última visita: {timeAgo(sinVisita)}
                    </p>
                    {days !== null && (
                      <p className="text-xs" style={{ color: days <= 7 ? '#fb923c' : S.sub }}>
                        {days > 0 ? `Vence en ${days} días` : 'Vencida'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => toggleCard(card)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={card.active
                      ? { backgroundColor: 'rgba(239,68,68,.12)', color: '#f87171' }
                      : { backgroundColor: `${S.accent}20`, color: S.accent }}>
                    {card.active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={() => deleteCard(card.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={{ backgroundColor: 'rgba(239,68,68,.08)', color: '#f87171' }}>
                    Eliminar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
