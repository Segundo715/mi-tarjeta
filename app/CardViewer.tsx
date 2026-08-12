'use client'

// Visor de tarjeta de fidelización sin formulario de registro: el cliente
// llega con un link personal (?id=UUID) que le comparte el negocio — el
// registro/alta de la tarjeta se hace por fuera de este proyecto (admin).
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { RewardIcon } from '@/app/components/RewardIcon'
import { BrandLogo } from '@/app/components/BrandLogo'

const QRCode = dynamic(() => import('react-qr-code'), { ssr: false })

const CATEGORIES_KEY = 'reward_categories'

const DEFAULT_CFG = {
  name: 'Tarjeta de lealtad', reward: 'Recompensa', goal: 5, icon: 'coffee', color: '#B90F45',
  iconColor: '#ffffff', logo: '', logoColor: '', image: '/uploads/menu/SalmonBowl.jpeg',
  brandText: 'Restaurante', brandLogo: '',
}

interface CardConfig {
  name: string; reward: string; goal: number; icon: string; color: string
  iconColor: string; logo: string; logoColor: string; image: string; brandText: string; brandLogo: string
}

interface LoyaltyCard {
  id: string; name: string; phone: string; visits: number
  active: boolean; cardType: string; expiresAt?: string; registeredAt: string
}

// Texto negro o blanco según la luminancia del color de fondo, para que el
// contraste nunca se pierda sin importar qué color esté configurado.
function contrastText(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#000' : '#fff'
}
function contrastTextSoft(hex: string): string {
  return contrastText(hex) === '#000' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)'
}

type Step = 'loading' | 'no-link' | 'not-found' | 'waiting' | 'card'

export default function CardViewer() {
  const params = useSearchParams()
  const id = params.get('id') ?? ''

  const [step, setStep] = useState<Step>('loading')
  const [card, setCard] = useState<LoyaltyCard | null>(null)
  const [cfg, setCfg] = useState<CardConfig>(DEFAULT_CFG)
  const [flipped, setFlipped] = useState(false)
  const [bgColor, setBgColor] = useState('#0a0a0a')
  const [btnColor, setBtnColor] = useState('#141414')
  const [logoSize, setLogoSize] = useState(80)

  function loadCard(cardId: string, categories: (CardConfig & { id: string })[]) {
    fetch(`/api/loyalty/${cardId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: LoyaltyCard | null) => {
        if (!data) { setStep('not-found'); return }
        setCard(data)
        const match = categories.find(c => c.id === (data.cardType ?? 'cafe'))
        if (match) setCfg(prev => ({ ...prev, ...match }))
        setStep(data.active ? 'card' : 'waiting')
      })
      .catch(() => setStep('not-found'))
  }

  useEffect(() => {
    // El logo siempre es el general de "Identidad del restaurante"; el resto
    // de la tarjeta (color, meta de sellos, ícono...) viene de la categoría
    // (reward_categories) que corresponda al cardType de esta tarjeta.
    Promise.all([
      fetch(`/api/settings?key=${CATEGORIES_KEY}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/settings?key=restaurant_name').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_logo').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=profile_logo').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_logo_color').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_logo_size').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_hover_color').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=sidebar_accent').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_bg_color').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_btn_color').then(r => r.json()).catch(() => ({})),
    ]).then(([catRes, nameRes, logoRes, pLogoRes, logoColorRes, logoSizeRes, hoverRes, accentRes, bgRes, btnRes]) => {
      const brandName = nameRes?.value || DEFAULT_CFG.brandText
      const brandLogoUrl = logoRes?.value || pLogoRes?.value || ''
      const brandLogoColor = logoColorRes?.value || ''
      const brandAccent = hoverRes?.value || accentRes?.value || DEFAULT_CFG.color
      if (bgRes?.value) setBgColor(bgRes.value)
      if (btnRes?.value) setBtnColor(btnRes.value)
      if (logoSizeRes?.value) setLogoSize(Number(logoSizeRes.value) || 80)

      let categories: (CardConfig & { id: string })[] = []
      if (catRes?.value) {
        try {
          const list = JSON.parse(catRes.value)
          if (Array.isArray(list)) categories = list
        } catch {}
      }

      setCfg({
        ...DEFAULT_CFG,
        brandText: brandName,
        color: brandAccent,
        logo: brandLogoUrl,
        logoColor: brandLogoColor,
      })

      if (!id) { setStep('no-link'); return }
      loadCard(id, categories)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Pantalla de espera — pollea hasta que el admin active la tarjeta
  useEffect(() => {
    if (step !== 'waiting' || !card) return
    const timer = setInterval(() => {
      fetch(`/api/loyalty/${card.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.active) { setCard(data); setStep('card') } })
        .catch(() => {})
    }, 5000)
    return () => clearInterval(timer)
  }, [step, card])

  if (step === 'loading') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: bgColor }}>
        {cfg.logo && <BrandLogo src={cfg.logo} color={cfg.logoColor} alt="Logo" className="mx-auto mb-4 animate-pulse" style={{ width: logoSize, height: logoSize, objectFit: 'contain' }} />}
        <p className="text-sm" style={{ color: contrastTextSoft(bgColor) }}>Cargando tu tarjeta...</p>
      </div>
    )
  }

  if (step === 'no-link' || step === 'not-found') {
    const btnText = contrastText(btnColor)
    const btnTextSoft = contrastTextSoft(btnColor)
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-6" style={{ backgroundColor: bgColor }}>
        {cfg.logo && <BrandLogo src={cfg.logo} color={cfg.logoColor} alt="Logo" className="mx-auto mb-6" style={{ width: logoSize, height: logoSize, objectFit: 'contain' }} />}
        <div className="w-full max-w-sm rounded-3xl p-8 text-center space-y-3" style={{ backgroundColor: btnColor, border: `1px solid ${cfg.color}` }}>
          <div className="text-5xl">🔗</div>
          <h2 className="text-xl font-black" style={{ color: btnText }}>
            {step === 'no-link' ? 'Falta el enlace de tu tarjeta' : 'No encontramos esa tarjeta'}
          </h2>
          <p className="text-sm" style={{ color: btnTextSoft }}>
            Pide a tu cajero o mesero el link o código QR de tu tarjeta de lealtad para verla aquí.
          </p>
        </div>
      </div>
    )
  }

  if (step === 'waiting') {
    const btnText = contrastText(btnColor)
    const btnTextSoft = contrastTextSoft(btnColor)
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-6" style={{ backgroundColor: bgColor }}>
        {cfg.logo && <BrandLogo src={cfg.logo} color={cfg.logoColor} alt="Logo" className="mx-auto mb-6" style={{ width: logoSize, height: logoSize, objectFit: 'contain' }} />}
        <div className="w-full max-w-sm rounded-3xl p-8 text-center space-y-4" style={{ backgroundColor: btnColor, border: `1px solid ${cfg.color}` }}>
          <div className="text-5xl animate-pulse">⏳</div>
          <h2 className="text-xl font-black" style={{ color: btnText }}>
            Hola{card?.name ? `, ${card.name.split(' ')[0]}` : ''}
          </h2>
          <p className="text-sm" style={{ color: btnTextSoft }}>Tu tarjeta todavía no está activa.</p>
          <p className="text-xs" style={{ color: cfg.color }}>
            El negocio la activará en breve. Esta página se actualizará sola.
          </p>
          <div className="flex justify-center gap-1 pt-2">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: cfg.color, animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const visits = card?.visits ?? 0
  const earned = visits >= cfg.goal
  const lightColor = `color-mix(in srgb, ${cfg.color} 55%, #fff)`
  const cardGradient = `linear-gradient(135deg, color-mix(in srgb, ${cfg.color} 25%, #000) 0%, ${cfg.color} 60%, ${lightColor} 100%)`

  // Estilos compartidos por las dos caras de la tarjeta (flip 3D)
  const faceStyle: React.CSSProperties = {
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    background: cardGradient,
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: bgColor }}>
      <div className="flex flex-col items-center px-4 pt-6">
        {/* ── TARJETA QUE GIRA ── */}
        <div className="w-full max-w-sm" style={{ perspective: '1600px' }}>
          <div role="button" tabIndex={0}
            onClick={() => setFlipped(f => !f)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped(f => !f) } }}
            aria-label="Girar tarjeta"
            className="relative w-full transition-transform duration-700 ease-out cursor-pointer"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              height: '460px',
            }}>

            {/* ───────── CARA FRONTAL ───────── */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl flex flex-col" style={faceStyle}>
              {/* Logo + marca */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                {cfg.logo && <BrandLogo src={cfg.logo} color={cfg.logoColor} alt="Logo" className="h-10 w-auto object-contain" />}
                {cfg.brandLogo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={cfg.brandLogo} alt="Marca" className="h-8 w-auto object-contain" />
                  : <span className="text-white font-black text-base tracking-wide">{cfg.brandText}</span>}
              </div>

              {/* Imagen con sellos superpuestos */}
              <div className="relative" style={{ height: '170px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cfg.image} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center gap-3 px-6">
                  {Array.from({ length: cfg.goal }).map((_, i) => {
                    const filled = i < visits
                    return (
                      <div key={i}
                        className="flex-1 aspect-square rounded-full flex items-center justify-center border-2 transition-all"
                        style={{
                          backgroundColor: filled ? cfg.color : 'rgba(255,255,255,0.18)',
                          borderColor: filled ? 'white' : 'rgba(255,255,255,0.45)',
                          backdropFilter: 'blur(3px)',
                          boxShadow: filled ? `0 0 14px ${cfg.color}` : 'none',
                        }}>
                        {filled && <RewardIcon name={cfg.icon} className="w-3/4 h-3/4" style={{ color: cfg.iconColor }} />}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Oferta + contador sellos */}
              <div className="flex items-start gap-3 px-5 py-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: lightColor }}>Oferta de recompensa</p>
                  <p className="text-white text-sm font-semibold mt-0.5 inline-flex items-center gap-1.5">
                    Cada {cfg.goal} visitas: {cfg.reward}
                    <RewardIcon name={cfg.icon} size={15} style={{ color: cfg.iconColor }} />
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: lightColor }}>Sellos</p>
                  <p className="text-white text-sm font-black mt-0.5">{visits}/{cfg.goal}</p>
                </div>
              </div>

              {/* Pista para girar */}
              <div className="flex items-center justify-center gap-1.5 pb-4 mt-auto text-white/80 text-xs font-semibold">
                <span>Toca para ver tu código</span>
                <span aria-hidden className="text-base leading-none">↻</span>
              </div>
            </div>

            {/* ───────── CARA TRASERA: QR + nombre del titular ───────── */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              style={{ ...faceStyle, transform: 'rotateY(180deg)' }}>
              {/* Logo centrado arriba */}
              <div className="flex justify-center pt-4 pb-2">
                {cfg.logo && <BrandLogo src={cfg.logo} color={cfg.logoColor} alt="Logo" className="h-9 w-auto object-contain" />}
              </div>

              {/* Cinta magnética (decorativa, sin función) */}
              <div aria-hidden className="w-full h-11" style={{ backgroundColor: '#000' }} />

              {/* Nombre grande pegado a la orilla */}
              <p className="text-white text-3xl font-black leading-tight px-5 pt-4 truncate">{card?.name}</p>

              {/* QR centrado con el aviso justo encima */}
              <div className="flex-1 flex flex-col items-center justify-center px-5">
                <p className="text-sm font-semibold text-center text-white mb-3">
                  {earned ? `🎉 ¡${cfg.reward}! Muéstraselo al cajero` : 'Muestra este QR al empleado'}
                </p>
                <div className="bg-white rounded-2xl p-4 flex flex-col items-center w-full max-w-[230px]">
                  <QRCode value={card!.id} size={150} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} />
                </div>
              </div>

              {/* Pista para girar */}
              <div className="flex items-center justify-center gap-1.5 pb-4 text-white/80 text-xs font-semibold">
                <span aria-hidden className="text-base leading-none">↻</span>
                <span>Toca para volver</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-center max-w-sm mt-4" style={{ color: contrastTextSoft(bgColor) }}>
          Toca la tarjeta para girarla.
        </p>
      </div>
    </div>
  )
}
