import { NextRequest, NextResponse } from 'next/server'

// Verifica que la cookie de sesión sea auténtica recomputando el HMAC.
// Formato del token: "<adminId>.<hmac_sha256(adminId)>"
// Se usa Web Crypto API porque el middleware corre en Edge Runtime (no Node.js).
async function verifySession(session: string | undefined): Promise<boolean> {
  if (!session) return false
  const dot = session.lastIndexOf('.')
  if (dot === -1) return false
  const id = session.slice(0, dot)
  const sig = session.slice(dot + 1)
  if (!id) return false
  const secret = process.env.ADMIN_SECRET ?? 'dev-secret'
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const computed = await crypto.subtle.sign('HMAC', key, enc.encode(id))
  const expected = Array.from(new Uint8Array(computed))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return sig === expected
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const session = req.cookies.get('admin_session')?.value
    if (!await verifySession(session))
      return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
