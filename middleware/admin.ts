
export default defineNuxtRouteMiddleware(async (to, from) => {
    const user = useSupabaseUser()
    if (!user.value || user.value.app_metadata.role !== 'admin') {
      return navigateTo('/unauthorized')
    }
  })
  