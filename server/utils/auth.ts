import { getServerSupabase } from './supabase-server'

export async function requireAdmin(event: any) {
  const supabase = getServerSupabase(event)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  return user
}
