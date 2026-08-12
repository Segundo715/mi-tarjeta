import { supabase } from './supabase'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

export interface LoyaltyCard {
  id: string
  name: string
  phone: string
  visits: number
  active: boolean
  cardType: string
  expiresAt?: string
  registeredAt: string
  stamps: { timestamp: string; visitsAfter: number }[]
}

function toCard(row: Record<string, unknown>): LoyaltyCard {
  return {
    id: row.id as string,
    name: row.name as string,
    phone: (row.phone as string) ?? '',
    visits: (row.visits as number) ?? 0,
    active: row.active as boolean,
    cardType: (row.card_type as string) ?? 'cafe',
    expiresAt: row.expires_at as string | undefined,
    registeredAt: row.registered_at as string,
    stamps: (row.stamps as LoyaltyCard['stamps']) ?? [],
  }
}

export async function getCard(id: string): Promise<LoyaltyCard | undefined> {
  const { data } = await supabase.from('loyalty_cards').select('*').eq('id', id).maybeSingle()
  return data ? toCard(data) : undefined
}

export async function getAllCards(): Promise<LoyaltyCard[]> {
  const { data } = await supabase.from('loyalty_cards').select('*').eq('restaurant_id', RID).order('registered_at', { ascending: false })
  return (data ?? []).map(toCard)
}

// Las tarjetas expiran según los meses configurados por categoría (default 3 meses).
function expiryDate(months = 3): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}

export async function deleteCard(id: string): Promise<boolean> {
  const { error } = await supabase.from('loyalty_cards').delete().eq('id', id)
  return !error
}

export async function deactivateCard(id: string): Promise<LoyaltyCard | null> {
  const { data } = await supabase.from('loyalty_cards').update({ active: false }).eq('id', id).select().single()
  return data ? toCard(data) : null
}

export async function activateCard(id: string): Promise<LoyaltyCard | null> {
  const { data } = await supabase.from('loyalty_cards')
    .update({ active: true, expires_at: expiryDate() })
    .eq('id', id).select().single()
  return data ? toCard(data) : null
}
