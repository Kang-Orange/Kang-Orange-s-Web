import { setCookie } from 'h3'
import { createServerClient, parseCookieHeader } from '@supabase/ssr'

export default defineNuxtPlugin({
  name: 'supabase-server',
  enforce: 'pre',
  setup() {
    const config = useRuntimeConfig()
    const event = useRequestEvent()

    const client = createServerClient(
      config.public.supabaseUrl,
      config.public.supabaseKey,
      {
        cookies: {
          getAll: () => parseCookieHeader(event.headers.get('cookie') ?? ''),
          setAll: (cookiesToSet) => {
            for (const { name, value, options } of cookiesToSet) {
              setCookie(event, name, value, options as any)
            }
          }
        }
      }
    )

    return {
      provide: { supabase: client }
    }
  }
})
