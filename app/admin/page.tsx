'use client'

// Sellar visitas: escanear el QR de la tarjeta del cliente (o buscarlo por
// teléfono) y agregarle un sello / canjear su premio. Solo tarjetas ya
// activas — las pendientes de activación se activan desde /admin/tarjetas.
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { QRScanner } from '@/app/components/QRScanner'
import { Icon } from '@/app/components/Icon'
import { useAdminBrand } from './AdminBrandContext'

const QRCode = dynamic(() => import('react-qr-code'), { ssr: false })

interface LoyaltyCardItem {
  id: string; name: string; phone: string; visits: number
  active: boolean; cardType: string
}

type ScanMode = 'idle' | 'camera' | 'phone'
type ScanState = 'idle' | 'scanning' | 'found' | 'stamping' | 'done'

const CARD_TYPE_LABELS: Record<string, string> = { cafe: 'Café', dosxuno: '2x1', descuento: 'Descuento', premium: 'Premium' }

export default function AdminSellarPage() {
  const { S, accentText } = useAdminBrand()
  const [origin, setOrigin] = useState('')
  const [scanMode, setScanMode] = useState<ScanMode>('idle')
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanned, setScanned] = useState<LoyaltyCardItem[]>([])
  const [scanError, setScanError] = useState('')
  const [phoneSearch, setPhoneSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const scanKey = useRef(0)

  useEffect(() => {
    queueMicrotask(() => setOrigin(window.location.origin))
  }, [])

  async function loadCard(id: string): Promise<boolean> {
    const res = await fetch(`/api/loyalty/${id}`)
    if (!res.ok) return false
    const card: LoyaltyCardItem = await res.json()
    if (!card.active) return false
    setScanned([card])
    setScanState('found')
    return true
  }

  async function searchByPhone(q: string): Promise<boolean> {
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
    if (!await searchByPhone(q)) {
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
    } else {
      setScanState('found')
    }
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

      <div className="pt-1">
        <h1 className="text-xl font-black" style={{ color: S.text }}>Sellar visitas</h1>
        <p className="text-xs mt-0.5" style={{ color: S.sub }}>Fidelización de clientes</p>
      </div>

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
    </div>
  )
}
