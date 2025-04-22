import { serverSupabaseUser } from "#supabase/server";

export default defineNuxtRouteMiddleware(async () => {
	// Server-side redirect
	if (import.meta.server) {
		const event = useRequestEvent();
		if (!event) return;
		// Get the user with the Nuxt Supabase module SSR-safe way
		const user = await serverSupabaseUser(event);
		if (!user) return navigateTo("/login");
	}

	// Client-side redirect (e.g. SPA navigation)
	if (import.meta.client) {
		// Client way of getting the user
		const user = useSupabaseUser();
		if (!user.value) return navigateTo("/login");
	}
});
