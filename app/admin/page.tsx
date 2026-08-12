'use client'

// Sellar visitas: escanear el QR de la tarjeta del cliente (o buscarlo por
// teléfono) y agregarle un sello / canjear su premio. La pestaña "Clientes"
// lista todas las tarjetas activas y pendientes de activación, con acciones
// directas — sin necesidad de escanear.
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { QRScanner } from '@/app/components/QRScanner'
import { Icon } from '@/app/components/Icon'
import { useAdminBrand } from './AdminBrandContext'

const QRCode = dynamic(() => import('react-qr-code'), { ssr: false })

interface LoyaltyCardItem {
  id: string; name: string; phone: string; visits: number
  active: boolean; cardType: string; registeredAt: string
}

type ScanMode = 'idle' | 'camera' | 'phone'
type ScanState = 'idle' | 'scanning' | 'found' | 'stamping' | 'done'
type Tab = 'scan' | 'dashboard'

const CARD_TYPE_LABELS: Record<string, string> = { cafe: 'Café', dosxuno: '2x1', descuento: 'Descuento', premium: 'Premium' }

function fmt(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminSellarPage() {
  const { S, accentText } = useAdminBrand()
  const [tab, setTab] = useState<Tab>('scan')
  const [origin, setOrigin] = useState('')
  const [scanMode, setScanMode] = useState<ScanMode>('idle')
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanned, setScanned] = useState<LoyaltyCardItem[]>([])
  const [scanError, setScanError] = useState('')
  const [phoneSearch, setPhoneSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [loyaltyPending, setLoyaltyPending] = useState<LoyaltyCardItem[]>([])
  const [loyaltyActive, setLoyaltyActive] = useState<LoyaltyCardItem[]>([])
  const [activatingCard, setActivatingCard] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const scanKey = useRef(0)

  useEffect(() => {
    queueMicrotask(() => setOrigin(window.location.origin))
    queueMicrotask(loadList)
    const poll = setInterval(loadList, 8000)
    return () => clearInterval(poll)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadList() {
    try {
      const res = await fetch('/api/loyalty')
      if (res.ok) {
        const all: LoyaltyCardItem[] = await res.json()
        setLoyaltyPending(all.filter(c => !c.active))
        setLoyaltyActive(all.filter(c => c.active))
      }
    } catch {}
  }

  async function loadCard(id: string): Promise<boolean> {
    const res = await fetch(`/api/loyalty/${id}`)
    if (!res.ok) return false
    const card: LoyaltyCardItem = await res.json()
    if (!card.active) return false
    setScanned([card])
    setScanState('found')
    return true
  }

  async function searchByPhoneQuery(q: string): Promise<boolean> {
    const res = await fetch('/api/loyalty')
    if (!res.ok) return false
    const all: LoyaltyCardItem[] = await res.json()
    const matches = all.filter(c => c.active && c.phone.replace(/\D/g, '').includes(q))
    if (!matches.length) return false
    setScanned(matches)
    setScanState('found')
    return true
  }

  async function handleScan(id: string) {
    setScanState('found'); setScanError('')
    if (await loadCard(id)) return
    setScanError('Tarjeta no encontrada o aún no activada.'); setScanState('idle')
  }

  async function handlePhoneSearch() {
    const q = phoneSearch.replace(/\D/g, '')
    if (q.length < 6) { setScanError('Ingresa al menos 6 dígitos del teléfono.'); return }
    setSearching(true); setScanError('')
    if (!await searchByPhoneQuery(q)) {
      setScanError('No se encontró ninguna tarjeta activa con ese número.')
    }
    setSearching(false)
  }

  function handleCameraError() {
    setScanError('La cámara no pudo abrirse. Usa la búsqueda por teléfono.')
    setScanMode('idle')
  }

  function resetScan() {
    scanKey.current += 1
    setScanMode('idle'); setScanState('idle'); setScanned([]); setScanError(''); setPhoneSearch('')
  }

  async function stampCard(id: string) {
    setScanState('stamping')
    const res = await fetch(`/api/loyalty/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stamp' }),
    })
    if (res.ok) {
      const updated: LoyaltyCardItem = await res.json()
      setScanned(list => list.map(c => c.id === id ? updated : c))
      setScanState('found')
      loadList()
    } else {
      setScanState('found'); setScanError('Error al registrar la visita.')
    }
  }

  async function redeemCard(id: string) {
    setScanState('stamping')
    const res = await fetch(`/api/loyalty/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'redeem' }),
    })
    if (res.ok) {
      const updated: LoyaltyCardItem = await res.json()
      setScanned(list => list.map(c => c.id === id ? updated : c))
      setScanState('found')
      loadList()
    } else {
      setScanState('found')
    }
  }

  async function activateCard(id: string) {
    setActivatingCard(id)
    await fetch(`/api/loyalty/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'activate' }),
    })
    setActivatingCard(null)
    loadList()
  }

  async function deleteCardFn(id: string) {
    if (!confirm('¿Eliminar esta tarjeta? El cliente perderá sus sellos.')) return
    await fetch(`/api/loyalty/${id}`, { method: 'DELETE' })
    loadList()
  }

  // Sellar/canjear directo desde la lista de "Clientes" — sin escanear el QR.
  async function stampCardInList(id: string) {
    setBusyId(id)
    await fetch(`/api/loyalty/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stamp' }),
    })
    await loadList()
    setBusyId(null)
  }

  async function redeemCardInList(id: string) {
    setBusyId(id)
    await fetch(`/api/loyalty/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'redeem' }),
    })
    await loadList()
    setBusyId(null)
  }

  const inp = 'w-full px-4 py-3 rounded-xl text-sm outline-none'
  const inpStyle = { backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }

  const ScannedCards = scanned.length > 0 ? (
    <div className="space-y-3">
      {scanned.map(card => (
        <div key={card.id} className="space-y-2">
          <div className="rounded-2xl p-4" style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="font-bold text-lg" style={{ color: S.text }}>{card.name}</p>
                <p className="text-sm" style={{ color: S.sub }}>{card.phone}</p>
                <p className="text-xs mt-0.5 font-semibold" style={{ color: S.accent }}>
                  {CARD_TYPE_LABELS[card.cardType] ?? card.cardType}
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold" style={{ color: card.visits >= 5 ? '#4ade80' : S.accent }}>
                  {card.visits}/5
                </span>
                <p className="text-xs" style={{ color: S.sub }}>visitas</p>
              </div>
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-1 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: i < card.visits ? S.accent : S.border, color: i < card.visits ? accentText : S.sub }}>
                  <Icon name="coffee" size={15} />
                </div>
              ))}
            </div>
          </div>

          {card.visits >= 5 ? (
            <button onClick={() => redeemCard(card.id)} disabled={scanState === 'stamping'}
              className="w-full font-bold py-4 rounded-xl text-base disabled:opacity-60"
              style={{ backgroundColor: '#f59e0b', color: '#000' }}>
              {scanState === 'stamping' ? 'Canjeando...' : <span className="inline-flex items-center justify-center gap-2"><Icon name="gift" size={16} /> Canjear premio y reiniciar</span>}
            </button>
          ) : (
            <button onClick={() => stampCard(card.id)} disabled={scanState === 'stamping'}
              className="w-full font-bold py-4 rounded-xl text-base disabled:opacity-60"
              style={{ backgroundColor: S.accent, color: accentText }}>
              {scanState === 'stamping' ? 'Sellando...' : <span className="inline-flex items-center justify-center gap-2"><Icon name="coffee" size={16} /> Sellar visita</span>}
            </button>
          )}
        </div>
      ))}
      <button onClick={resetScan} className="w-full text-sm underline py-1" style={{ color: S.sub }}>
        Buscar otro cliente
      </button>
    </div>
  ) : null

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">

      {/* Header + tabs */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-black" style={{ color: S.text }}>Sellar visitas</h1>
          <p className="text-xs mt-0.5" style={{ color: S.sub }}>Fidelización de clientes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('scan')}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-colors"
            style={tab === 'scan'
              ? { backgroundColor: S.accent, color: accentText }
              : { backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }}>
            Sellar
          </button>
          <button onClick={() => { setTab('dashboard'); resetScan() }}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-colors relative"
            style={tab === 'dashboard'
              ? { backgroundColor: S.accent, color: accentText }
              : { backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }}>
            Clientes
            {loyaltyPending.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {loyaltyPending.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── TAB: SELLAR ── */}
      {tab === 'scan' && (<>

        {/* Alerta de nuevos registros pendientes */}
        {loyaltyPending.length > 0 && (
          <div className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer"
            style={{ backgroundColor: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.4)' }}
            onClick={() => { setTab('dashboard'); resetScan() }}>
            <span className="text-red-400 shrink-0"><Icon name="bell" size={20} /></span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" style={{ color: '#f87171' }}>
                {loyaltyPending.length} tarjeta{loyaltyPending.length !== 1 ? 's' : ''} esperando activación
              </p>
              <p className="text-xs" style={{ color: '#f87171', opacity: 0.7 }}>Toca para ver y activar</p>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,.2)', color: '#f87171' }}>Ver →</span>
          </div>
        )}

        {/* QR del negocio */}
        <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <h2 className="font-bold text-base mb-1" style={{ color: S.accent }}>QR del negocio</h2>
          <p className="text-xs mb-4" style={{ color: S.sub }}>Muéstralo para que los clientes se registren</p>
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-xl bg-white inline-block min-h-[172px] min-w-[172px] flex items-center justify-center">
              {origin ? <QRCode value={origin} size={160} /> : <span className="text-gray-300 text-sm">Cargando…</span>}
            </div>
          </div>
          {origin && <p className="text-xs break-all" style={{ color: S.sub }}>{origin}</p>}
        </div>

        {/* Sellar visita */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <h2 className="font-bold text-base mb-3" style={{ color: S.accent }}>Sellar visita del cliente</h2>

          {scanError && (
            <div className="rounded-xl px-4 py-3 text-sm mb-3"
              style={{ backgroundColor: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: '#f87171' }}>
              {scanError}
            </div>
          )}

          {scanMode === 'idle' && scanState === 'idle' && (
            <div className="space-y-3">
              <button onClick={() => { setScanError(''); setScanMode('camera'); setScanState('scanning') }}
                className="w-full font-bold py-4 rounded-xl text-base"
                style={{ backgroundColor: S.accent, color: accentText }}>
                <span className="inline-flex items-center justify-center gap-2"><Icon name="camera" size={16} /> Escanear QR del cliente</span>
              </button>
              <button onClick={() => { setScanError(''); setScanMode('phone') }}
                className="w-full font-bold py-4 rounded-xl text-base"
                style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }}>
                <span className="inline-flex items-center justify-center gap-2"><Icon name="search" size={16} /> Buscar por teléfono</span>
              </button>
              <p className="text-xs text-center" style={{ color: S.sub }}>Si la cámara no abre, usa la búsqueda por teléfono</p>
            </div>
          )}

          {scanMode === 'camera' && scanState === 'scanning' && (
            <div>
              <QRScanner key={scanKey.current} onScan={id => handleScan(id)} onCameraError={handleCameraError} />
              <button onClick={resetScan} className="w-full mt-3 text-sm underline py-1" style={{ color: S.sub }}>Cancelar</button>
            </div>
          )}

          {scanMode === 'phone' && scanState === 'idle' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: S.accent }}>Número de teléfono del cliente</label>
                <input type="tel" value={phoneSearch}
                  onChange={e => setPhoneSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePhoneSearch()}
                  placeholder="Ej. 55 1234 5678"
                  className={`${inp} text-lg`} style={inpStyle} autoFocus />
              </div>
              <button onClick={handlePhoneSearch} disabled={searching}
                className="w-full font-bold py-4 rounded-xl text-base disabled:opacity-60"
                style={{ backgroundColor: S.accent, color: accentText }}>
                {searching ? 'Buscando...' : <span className="inline-flex items-center justify-center gap-2"><Icon name="search" size={16} /> Buscar cliente</span>}
              </button>
              <button onClick={resetScan} className="w-full text-sm underline py-1" style={{ color: S.sub }}>Cancelar</button>
            </div>
          )}

          {scanState !== 'idle' && scanState !== 'scanning' && ScannedCards}
        </div>
      </>)}

      {/* ── TAB: CLIENTES ── */}
      {tab === 'dashboard' && (<>

        {/* Tarjetas por activar */}
        {loyaltyPending.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-red-500">{loyaltyPending.length}</span>
              <h2 className="font-bold" style={{ color: '#f87171' }}>Tarjetas por activar</h2>
            </div>
            {loyaltyPending.map(c => (
              <div key={c.id} className="rounded-2xl p-4"
                style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderLeft: '4px solid #ef4444' }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold" style={{ color: S.text }}>{c.name}</p>
                    <p className="text-sm" style={{ color: S.sub }}>{c.phone}</p>
                    <p className="text-xs mt-0.5" style={{ color: S.sub }}>Registrado: {fmt(c.registeredAt)}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,.15)', color: '#f87171' }}>Pendiente</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => activateCard(c.id)} disabled={activatingCard === c.id}
                    className="flex-1 font-bold py-2.5 rounded-xl text-sm disabled:opacity-60"
                    style={{ backgroundColor: S.accent, color: accentText }}>
                    <span className="inline-flex items-center justify-center gap-2">
                      <Icon name="check" size={15} /> {activatingCard === c.id ? 'Activando...' : 'Activar'}
                    </span>
                  </button>
                  <button onClick={() => deleteCardFn(c.id)}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold"
                    style={{ backgroundColor: 'rgba(239,68,68,.15)', color: '#f87171', border: '1px solid rgba(239,68,68,.3)' }}>
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              </div>
            ))}
            <div className="h-px" style={{ backgroundColor: S.border }} />
          </div>
        )}

        {/* Tarjetas activas */}
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: S.accent, color: accentText }}>{loyaltyActive.length}</span>
          <h2 className="font-bold" style={{ color: S.text }}>Tarjetas activas</h2>
        </div>

        {loyaltyActive.length === 0 && (
          <div className="flex flex-col items-center py-10" style={{ color: S.sub }}>
            <span className="mb-2"><Icon name="coffee" size={34} /></span>
            <p>Aún no hay tarjetas activas</p>
          </div>
        )}

        {loyaltyActive.map(c => (
          <div key={c.id} className="rounded-2xl p-4"
            style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-bold" style={{ color: S.text }}>{c.name}</p>
                <p className="text-sm" style={{ color: S.sub }}>{c.phone}</p>
                <p className="text-xs mt-0.5" style={{ color: S.sub }}>Registrado: {fmt(c.registeredAt)}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-full"
                style={{ backgroundColor: `${S.accent}20`, color: S.accent }}>
                {c.visits}/5 sellos
              </span>
            </div>
            <div className="flex gap-2 mb-2">
              {c.visits >= 5 ? (
                <button onClick={() => redeemCardInList(c.id)} disabled={busyId === c.id}
                  className="flex-1 font-bold py-2 rounded-xl text-sm disabled:opacity-60"
                  style={{ backgroundColor: '#f59e0b', color: '#000' }}>
                  {busyId === c.id ? 'Canjeando...' : <span className="inline-flex items-center justify-center gap-1.5"><Icon name="gift" size={14} /> Canjear premio</span>}
                </button>
              ) : (
                <button onClick={() => stampCardInList(c.id)} disabled={busyId === c.id}
                  className="flex-1 font-bold py-2 rounded-xl text-sm disabled:opacity-60"
                  style={{ backgroundColor: S.accent, color: accentText }}>
                  {busyId === c.id ? 'Sellando...' : <span className="inline-flex items-center justify-center gap-1.5"><Icon name="coffee" size={14} /> Sellar visita</span>}
                </button>
              )}
            </div>
            <button onClick={() => deleteCardFn(c.id)}
              className="w-full rounded-xl py-1.5 text-sm font-medium inline-flex items-center justify-center gap-1.5"
              style={{ color: '#f87171', border: '1px solid rgba(239,68,68,.3)' }}>
              <Icon name="trash" size={14} /> Eliminar tarjeta
            </button>
          </div>
        ))}
      </>)}
    </div>
  )
}
