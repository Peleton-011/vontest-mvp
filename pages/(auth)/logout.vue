<script setup>
const supabase = useSupabaseClient();
const router = useRouter();

// Log out the user
const logout = async () => {
	await supabase.auth.signOut();
	// After logging out, redirect to homepage (or login page)
	router.push("/");
};

// Redirect to homepage manually if the user chooses
const redirectToHome = () => {
	router.push("/");
};

// Automatically log out the user when they visit the page
logout();
</script>

<template>
	<section
		class="flex flex-col items-center min-h-screen bg-neutral-900 text-white mt-8"
	>
		<u-card class="max-w-lg mx-auto p-6 bg-neutral-800 rounded-lg">
			<h1 class="text-3xl font-semibold text-neutral-100">Logged Out</h1>
			<p class="mt-4 text-lg text-neutral-400">
				You have successfully logged out of your account.
			</p>
			<p class="mt-4 text-lg text-neutral-400">
				You will be redirected to the homepage in a few seconds.
			</p>

			<div class="mt-6">
				<!-- Optional: You can also provide a manual redirect button -->
				<u-button
					size="lg"
					block
					@click="redirectToHome"
					class="font-bold"
				>
					Go to Homepage
					<u-icon name="i-lucide-home" class="ml-2" />
				</u-button>
			</div>
		</u-card>
	</section>
</template>
