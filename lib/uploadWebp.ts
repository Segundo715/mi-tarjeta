'use client'
// Convierte una imagen a WebP en el navegador (Canvas API) y la sube al endpoint dado.
// Usar solo en componentes cliente — no importar desde rutas del servidor.

async function browserToWebp(file: File): Promise<File> {
  // SVG se rasteriza igual que los demás formatos: Supabase Storage fuerza
  // "Content-Disposition: attachment" en SVGs subidos tal cual (política
  // anti-XSS a nivel de gateway, no configurable desde el cliente), lo que
  // hace que el navegador los descargue en vez de mostrarlos en un <img>.
  if (file.type === 'image/webp') return file
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')?.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          const name = file.name.replace(/\.[^.]+$/, '.webp')
          resolve(new File([blob], name, { type: 'image/webp' }))
        },
        'image/webp',
        0.82,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// onSize recibe (bytesOriginal, bytesWebP) justo antes de subir — úsalo para mostrar en UI.
export async function uploadWebp(
  file: File,
  apiUrl: string,
  onSize?: (original: number, webp: number) => void,
): Promise<string | null> {
  const webpFile = await browserToWebp(file)
  onSize?.(file.size, webpFile.size)
  const fd = new FormData()
  fd.append('file', webpFile)
  try {
    const r = await fetch(apiUrl, { method: 'POST', body: fd })
    if (!r.ok) return null
    const d = await r.json()
    return d.url ?? null
  } catch {
    return null
  }
}
