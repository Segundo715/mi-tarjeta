import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { verifySession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { toWebp } from '@/lib/imageWebp'

export async function POST(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'No se recibió ningún archivo' }, { status: 400 })

  const raw = Buffer.from(await file.arrayBuffer())
  const { data, contentType, ext } = await toWebp(raw, file.type)
  const storagePath = `settings/${randomUUID()}${ext}`

  const { error } = await supabase.storage.from('uploads').upload(storagePath, data, {
    contentType,
    upsert: true,
  })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${storagePath}`
  return Response.json({ url })
}
