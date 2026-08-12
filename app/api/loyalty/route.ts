import { NextRequest } from 'next/server'
import { getAllCards } from '@/lib/loyaltyDb'
import { verifySession } from '@/lib/auth'

// Requiere sesión de admin — solo se usa desde el editor en /admin.
export async function GET(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json(await getAllCards())
}
