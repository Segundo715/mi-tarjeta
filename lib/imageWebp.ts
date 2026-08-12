// Conversión WebP en el servidor.
// Sharp tiene binarios nativos que no están disponibles en Vercel Hobby.
// Por eso el servidor sube el archivo original y la conversión WebP
// ocurre en el navegador (ver lib/uploadWebp.ts).
export async function toWebp(
  buffer: Buffer,
  mimeType: string,
): Promise<{ data: Buffer; contentType: string; ext: string }> {
  const extMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg':  '.jpg',
    'image/png':  '.png',
    'image/gif':  '.gif',
    'image/webp': '.webp',
    'image/avif': '.avif',
    'image/svg+xml': '.svg',
  }
  const ext = extMap[mimeType] ?? '.jpg'
  return { data: buffer, contentType: mimeType, ext }
}
