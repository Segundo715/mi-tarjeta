'use client'

// El recoloreado usa `mask-image`, que enmascara por el canal alfa del logo
// (no por su color original) — funciona en PNG/WebP/SVG con fondo
// transparente. Un JPG sin transparencia se llenaría por completo del color
// elegido, así que esto solo tiene sentido con logos de fondo transparente.
import { useEffect, useRef, useState } from 'react'

interface BrandLogoProps {
  src: string
  color?: string
  alt?: string
  className?: string
  style?: React.CSSProperties
}

export function BrandLogo({ src, color, alt = 'Logo', className, style }: BrandLogoProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [ratio, setRatio] = useState<number | null>(null)

  useEffect(() => {
    if (!color) return
    const img = new window.Image()
    img.onload = () => { if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight) }
    img.src = src
  }, [src, color])

  // El span enmascarado no tiene tamaño intrínseco como un <img> — si solo una
  // dimensión viene fija (ej. clase Tailwind "h-9 w-auto"), la otra colapsa a
  // 0. Se mide después de montar y se completa con la proporción real del logo.
  useEffect(() => {
    if (!color || !ratio || !ref.current) return
    const el = ref.current
    const h = el.offsetHeight
    const w = el.offsetWidth
    if (h > 0 && w === 0) el.style.width = `${h * ratio}px`
    else if (w > 0 && h === 0) el.style.height = `${w / ratio}px`
  }, [ratio, color])

  if (color) {
    return (
      <span
        ref={ref}
        role="img"
        aria-label={alt}
        className={className}
        style={{
          ...style,
          display: 'inline-block',
          backgroundColor: color,
          WebkitMaskImage: `url("${src}")`,
          maskImage: `url("${src}")`,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
        }}
      />
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} style={style} />
}
