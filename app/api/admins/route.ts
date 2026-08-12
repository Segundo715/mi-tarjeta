import { NextRequest } from 'next/server'
import { verifySession } from '@/lib/auth'
import { listAdmins, createAdmin, deleteAdmin, countAdmins, getAdminById } from '@/lib/adminDb'

// Gestión de perfiles de admin desde Configuración (solo admins autenticados).
// Comparte la misma tabla `admins` que mi-menu/mi-card.
export async function GET(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  return Response.json(await listAdmins())
}

export async function POST(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { name, password, role } = await req.json()
  if (!name?.trim() || !password)
    return Response.json({ error: 'Nombre y contraseña requeridos' }, { status: 400 })

  const admin = await createAdmin(name.trim(), password, role ?? 'Administrador')
  if (!admin)
    return Response.json({ error: 'Ese nombre ya está en uso' }, { status: 409 })

  return Response.json({ id: admin.id, name: admin.name, role: admin.role, createdAt: admin.createdAt })
}

export async function DELETE(req: NextRequest) {
  const currentId = verifySession(req.cookies.get('admin_session')?.value)
  if (!currentId)
    return Response.json({ error: 'No autorizado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'id requerido' }, { status: 400 })

  // Protecciones: no puedes borrarte a ti mismo ni dejar el sistema sin ningún admin.
  if (id === currentId)
    return Response.json({ error: 'No puedes eliminar tu propio perfil' }, { status: 400 })

  if (!(await getAdminById(id)))
    return Response.json({ error: 'Perfil no encontrado' }, { status: 404 })

  if ((await countAdmins()) <= 1)
    return Response.json({ error: 'Debe quedar al menos un perfil' }, { status: 400 })

  await deleteAdmin(id)
  return Response.json({ ok: true })
}
