import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  const config = useRuntimeConfig()
  return createClient(config.supabaseUrl, config.supabaseServiceKey)
}
