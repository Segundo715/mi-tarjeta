import { createHmac } from 'node:crypto'

// Usado en route handlers de Node.js (API Routes).
// El middleware usa Web Crypto API porque corre en Edge Runtime.
const SECRET = process.env.ADMIN_SECRET ?? 'dev-secret'

function hmac(data: string): string {
  return createHmac('sha256', SECRET).update(data).digest('hex')
}

// Genera un token con formato "<adminId>.<firma>" para la cookie HttpOnly.
export function createSession(adminId: string): string {
  return `${adminId}.${hmac(adminId)}`
}

// Devuelve el adminId si la firma es válida, o null si el token fue alterado.
export function verifySession(session?: string): string | null {
  if (!session) return null
  const dot = session.lastIndexOf('.')
  if (dot === -1) return null
  const adminId = session.slice(0, dot)
  const sig = session.slice(dot + 1)
  if (!adminId || hmac(adminId) !== sig) return null
  return adminId
}
