import { supabase } from './supabase'

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
