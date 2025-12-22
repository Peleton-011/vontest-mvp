export default defineNuxtRouteMiddleware(async (to, from) => {
	// Skip middleware on server-side
	if (process.server) return;

	const user = useSupabaseUser();
	const supabase = useSupabaseClient();

	// Don't check if user is not logged in
	if (!user.value) return;

	// Don't redirect if already on profile setup, auth pages, or logout
	const excludedPaths = ['/profile/setup', '/profile/settings', '/login', '/signup', '/confirm', '/logout'];
	if (excludedPaths.some(path => to.path.startsWith(path))) {
		return;
	}

	// Check if user has completed their profile
	try {
		const { data: profile } = await supabase
			.from('profiles')
			.select('username')
			.eq('id', user.value.id)
			.single();

		// If no username, redirect to profile setup
		if (!profile?.username) {
			return navigateTo('/profile/setup');
		}
	} catch (error) {
		console.error('Error checking profile:', error);
	}
});
