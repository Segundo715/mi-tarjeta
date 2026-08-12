import { NextRequest } from 'next/server'
import { getCard, deleteCard, deactivateCard, activateCard } from '@/lib/loyaltyDb'
import { verifySession } from '@/lib/auth'

// GET es público: el visor de tarjeta (/?id=) lo necesita sin sesión.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const card = await getCard(id)
  return card ? Response.json(card) : Response.json({ error: 'No encontrado' }, { status: 404 })
}

// PATCH/DELETE requieren sesión de admin — activar/desactivar/eliminar desde /admin.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { action } = await req.json()
  if (action === 'deactivate') return Response.json(await deactivateCard(id))
  if (action === 'activate') return Response.json(await activateCard(id))
  return Response.json({ error: 'Acción inválida' }, { status: 400 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  return await deleteCard(id)
    ? Response.json({ ok: true })
    : Response.json({ error: 'No encontrado' }, { status: 404 })
}
