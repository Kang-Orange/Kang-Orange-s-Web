import { setCookie } from 'h3'
import { createServerClient, parseCookieHeader } from '@supabase/ssr'

export function getServerSupabase(event: any) {
  const config = useRuntimeConfig()
  return createServerClient(config.supabaseUrl, config.supabaseKey, {
    cookies: {
      getAll: () => parseCookieHeader(event.headers.get('cookie') ?? ''),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(event, name, value, options as any)
        }
      }
    }
  })
}
