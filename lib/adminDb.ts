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

// Comparte la misma tabla `admins` (y las mismas cuentas) que mi-card/mi-menu.
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

export async function createAdmin(name: string, password: string, role = 'Administrador'): Promise<AdminUser | null> {
  // ilike → búsqueda case-insensitive: "Jesus" y "jesus" son el mismo admin.
  const { data: existing } = await supabase.from('admins').select('id').ilike('name', name).eq('restaurant_id', RID).maybeSingle()
  if (existing) return null // nombre duplicado
  const { data, error } = await supabase.from('admins').insert({
    name: name.trim(),
    password_hash: hashPassword(name, password),
    role: role.trim(),
    restaurant_id: RID,
  }).select().single()
  if (error) throw error
  return toAdmin(data)
}

export async function listAdmins(): Promise<AdminUser[]> {
  const { data } = await supabase.from('admins')
    .select('id,name,role,created_at').eq('restaurant_id', RID).order('created_at', { ascending: true })
  return (data ?? []).map(r => ({
    id: r.id as string,
    name: r.name as string,
    role: (r.role as string) || 'Administrador',
    createdAt: r.created_at as string,
  }))
}

export async function countAdmins(): Promise<number> {
  const { count } = await supabase.from('admins').select('id', { count: 'exact', head: true }).eq('restaurant_id', RID)
  return count ?? 0
}

export async function deleteAdmin(id: string): Promise<void> {
  await supabase.from('admins').delete().eq('id', id)
}
