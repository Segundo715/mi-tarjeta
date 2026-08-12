import { createClient } from '@supabase/supabase-js'

// strip BOM (U+FEFF=65279) que PowerShell agrega al guardar env vars en Vercel
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(new RegExp('^' + String.fromCharCode(65279)), '').trim()
const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').replace(new RegExp('^' + String.fromCharCode(65279)), '').trim()

export const supabase = createClient(url, key)
