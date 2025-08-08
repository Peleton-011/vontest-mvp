export default defineNuxtRouteMiddleware((to, from) => {
    //Only available in dev mode, not production
    if (import.meta.dev ) {
        return navigateTo('/')
    }
})
