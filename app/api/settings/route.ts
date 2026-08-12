import { NextRequest } from 'next/server'
import { getSetting } from '@/lib/settingsDb'

// Solo lectura — este proyecto no tiene admin, así que no hay POST.
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') ?? ''
  if (!key) return Response.json({ error: 'key requerido' }, { status: 400 })
  const value = await getSetting(key)
  return Response.json({ key, value })
}
