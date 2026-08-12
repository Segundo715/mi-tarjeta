import { supabase } from './supabase'
import { createHash } from 'node:crypto'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

export interface AdminUser {
  id: string
  name: string
  role: string
  createdAt: string
}

// Incluye el nombre (en minúsculas) como sal para que dos admins con la misma
// contraseña tengan hashes distintos. El secret agrega una segunda capa de sal global.
function hashPassword(name: string, password: string): string {
  const secret = process.env.ADMIN_SECRET ?? 'dev-secret'
  return createHash('sha256').update(`${secret}:${name.toLowerCase()}:${password}`).digest('hex')
}

function toAdmin(row: Record<string, unknown>): AdminUser {
  return {
    id: row.id as string,
    name: row.name as string,
    role: (row.role as string) || 'Administrador',
    createdAt: row.created_at as string,
  }
}

// Reutiliza la misma tabla `admins` (y las mismas cuentas) que mi-card/mi-menu —
// este proyecto no crea ni administra cuentas, solo verifica login.
export async function authenticateAdmin(name: string, password: string): Promise<AdminUser | null> {
  const hash = hashPassword(name, password)
  const { data } = await supabase.from('admins')
    .select('*').ilike('name', name).eq('password_hash', hash).eq('restaurant_id', RID).maybeSingle()
  return data ? toAdmin(data) : null
}

export async function getAdminById(id: string): Promise<AdminUser | undefined> {
  const { data } = await supabase.from('admins').select('*').eq('id', id).maybeSingle()
  return data ? toAdmin(data) : undefined
}
