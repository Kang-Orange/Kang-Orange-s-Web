import type { User, AuthError } from '@supabase/supabase-js'

const user = ref<User | null>(null)
const loading = ref(true)

export function useAuth() {
  const { $supabase } = useNuxtApp()

  if (import.meta.server) {
    // Server: middleware handles getSession(), just expose state
  }

  if (import.meta.client && loading.value) {
    $supabase.auth.getSession().then(({ data }: { data: { session: { user: User } | null } }) => {
      user.value = data.session?.user ?? null
      loading.value = false
    })

    $supabase.auth.onAuthStateChange((_event: string, session: { user: User } | null) => {
      user.value = session?.user ?? null
    })
  }

  async function login(email: string, password: string): Promise<{ error: AuthError | null }> {
    const { error } = await $supabase.auth.signInWithPassword({ email, password })
    if (!error) {
      const { data } = await $supabase.auth.getUser()
      user.value = data.user
    }
    return { error }
  }

  async function logout() {
    await $supabase.auth.signOut()
    user.value = null
    await navigateTo('/login')
  }

  return { user, loading, login, logout }
}
