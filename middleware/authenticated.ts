export default defineNuxtRouteMiddleware(async () => {
    if (import.meta.server) {
      const event = useRequestEvent()
      if (!event) return
  
      // Dynamic import to avoid static bundling error
      const { serverSupabaseUser } = await import('#supabase/server')
      const user = await serverSupabaseUser(event)
  
      if (!user) {
        return navigateTo('/login')
      }
    }
  
    if (import.meta.client) {
      const user = useSupabaseUser()
      if (!user.value) {
        return navigateTo('/login')
      }
    }
  })
  