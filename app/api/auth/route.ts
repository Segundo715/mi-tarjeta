import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'
import { authenticateAdmin } from '@/lib/adminDb'

// Usa las mismas cuentas de la tabla `admins` que mi-card/mi-menu — no se
// pueden crear cuentas nuevas desde aquí, solo iniciar sesión con una ya existente.
export async function POST(req: NextRequest) {
  const { name, password } = await req.json()

  if (!name?.trim() || !password)
    return NextResponse.json({ error: 'Nombre y contraseña requeridos' }, { status: 400 })

  const admin = await authenticateAdmin(name.trim(), password)
  if (!admin)
    return NextResponse.json({ error: 'Nombre o contraseña incorrectos' }, { status: 401 })

  const res = NextResponse.json({ ok: true, name: admin.name })
  res.cookies.set('admin_session', createSession(admin.id), { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 86400 })
  res.cookies.set('admin_name', admin.name, { path: '/', sameSite: 'lax', maxAge: 86400 })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_session', '', { path: '/', maxAge: 0 })
  res.cookies.set('admin_name', '', { path: '/', maxAge: 0 })
  return res
}
