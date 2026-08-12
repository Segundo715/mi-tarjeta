import type { CSSProperties, ReactNode } from 'react'

// Íconos planos RELLENOS (bold) para las categorías de Rewards.
// Se guarda la CLAVE (ej. 'coffee') en la categoría, o bien una URL si se sube un ícono propio.
const ICONS: Record<string, ReactNode> = {
  coffee: (
    <>
      <path d="M3 7h13v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z" />
      <path d="M16 8h2.5a3.5 3.5 0 0 1 0 7H16v-2h2.5a1.5 1.5 0 0 0 0-3H16z" />
      <path d="M6 2c-.5 1 .5 1.8 0 3h1.7c.4-1.3-.5-2-.1-3zM9.5 2c-.5 1 .5 1.8 0 3h1.7c.4-1.3-.5-2-.1-3z" />
    </>
  ),
  cup: (
    <>
      <path d="M5 6h14l-1.3 13.3A2 2 0 0 1 15.7 21H8.3a2 2 0 0 1-2-1.7L5 6z" />
      <path d="M4 3h16v3H4z" />
    </>
  ),
  cake: (
    <>
      <path d="M5 11h14a1 1 0 0 1 1 1v8H4v-8a1 1 0 0 1 1-1z" />
      <path d="M3 19.5h18V22H3z" />
      <path d="M11 6.5h2V11h-2z" />
      <circle cx="12" cy="4.8" r="1.4" />
    </>
  ),
  gift: (
    <>
      <path d="M3 8h8v3H3zM13 8h8v3h-8z" />
      <path d="M4.5 11H11v10H5.5a1 1 0 0 1-1-1zM13 11h6.5v9a1 1 0 0 1-1 1H13z" />
      <path d="M12 8S9.6 8 8.4 6.9A2 2 0 1 1 11.4 4.3C12.3 5.2 12 8 12 8zM12 8s2.4 0 3.6-1.1A2 2 0 1 0 12.6 4.3C11.7 5.2 12 8 12 8z" />
    </>
  ),
  star: <path d="M12 2.2l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.7 5.9 20.4l1.5-6.7L2.3 9.1l6.8-.7z" />,
  crown: <path d="M2 8.5l4.5 3.1L12 4.3l5.5 7.3L22 8.5l-1.9 10.7a1 1 0 0 1-1 .8H4.9a1 1 0 0 1-1-.8z" />,
  tag: (
    <path fillRule="evenodd" clipRule="evenodd"
      d="M3 3h8.3a1 1 0 0 1 .7.3l8.7 8.7a2 2 0 0 1 0 2.8l-6.6 6.6a2 2 0 0 1-2.8 0L2.3 12.7a1 1 0 0 1-.3-.7V4a1 1 0 0 1 1-1zm4 3a1.6 1.6 0 1 0 0 3.2A1.6 1.6 0 0 0 7 6z" />
  ),
  percent: (
    <>
      <path d="M18.8 5.2a1.6 1.6 0 0 1 0 2.2L7.4 18.8a1.6 1.6 0 1 1-2.2-2.2L16.6 5.2a1.6 1.6 0 0 1 2.2 0z" />
      <circle cx="7.2" cy="7.2" r="2.4" />
      <circle cx="16.8" cy="16.8" r="2.4" />
    </>
  ),
  heart: <path d="M12 21S3 14.6 3 8.7A4.6 4.6 0 0 1 12 6.1 4.6 4.6 0 0 1 21 8.7C21 14.6 12 21 12 21z" />,
  bag: (
    <>
      <path d="M5 7.5h14l-1 12.6a1 1 0 0 1-1 .9H7a1 1 0 0 1-1-.9z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  ticket: <path d="M3 8.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" />,
  bolt: <path d="M13 2L4 13.5h6.2L9 22l9-12.5h-6.2z" />,
  flame: <path d="M12 2C9.5 6 8 8 8 11.2A4 4 0 0 0 16 11.2c0-1.6-.6-2.7-1.7-3.8C13.4 9 13 7 12 2z" />,
}

export const REWARD_ICON_KEYS = Object.keys(ICONS)

// true si el ícono es una imagen subida por el usuario (URL/ruta) en vez de una clave
export function isCustomIcon(name: string) {
  return /^(https?:|\/|data:)/.test(name ?? '')
}

export function RewardIcon({
  name, size = 24, className, style,
}: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  if (isCustomIcon(name)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={name} alt="" width={size} height={size} className={className}
      style={{ objectFit: 'contain', display: 'inline-block', ...style }} />
  }
  const node = ICONS[name] ?? ICONS.coffee
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"
      className={className} style={style}>
      {node}
    </svg>
  )
}
