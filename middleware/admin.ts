export default defineNuxtRouteMiddleware(async (to, from) => {
  // Check if session or user exists on the server-side
  const user = useSupabaseUser(); 
  
  // Log for debugging purposes
  console.log('User Metadata:', user.value?.app_metadata);

  if (!user.value) {
    // If no user is logged in, redirect to the login page
    return navigateTo('/login')
  }

  if (user.value.app_metadata?.role !== 'admin') {
    // If the user doesn't have an admin role, redirect
    return navigateTo('/unauthorized');
  }

  // Everything is good, continue to the requested page
})
