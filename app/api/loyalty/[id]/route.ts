import { NextRequest } from 'next/server'
import { getCard } from '@/lib/loyaltyDb'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const card = await getCard(id)
  return card ? Response.json(card) : Response.json({ error: 'No encontrado' }, { status: 404 })
}
