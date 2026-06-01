export default defineNuxtRouteMiddleware(async (to) => {
  const { user, loading } = useAuth()

  if (import.meta.server) {
    const { $supabase } = useNuxtApp()
    const { data } = await $supabase.auth.getSession()
    user.value = data.session?.user ?? null
    loading.value = false

    if (to.path.startsWith('/admin') && !user.value) {
      return navigateTo('/login')
    }
    if (to.path === '/login' && user.value) {
      return navigateTo('/admin')
    }
    return
  }

  // Client side: wait for useAuth() to resolve session
  while (loading.value) {
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  if (to.path === '/login' && user.value) {
    return navigateTo('/admin')
  }

  if (to.path.startsWith('/admin') && !user.value) {
    return navigateTo('/login')
  }
})
