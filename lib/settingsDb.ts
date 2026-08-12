import { supabase } from './supabase'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

function scopedKey(key: string): string {
  return RID === 'default' ? key : `${RID}:${key}`
}

export async function getSetting(key: string, fallback = ''): Promise<string> {
  const { data } = await supabase.from('settings').select('value').eq('key', scopedKey(key)).maybeSingle()
  return data?.value ?? fallback
}

export async function setSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase.from('settings').upsert({ key: scopedKey(key), value }, { onConflict: 'key' })
  if (error) throw error
}
