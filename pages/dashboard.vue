<script setup>
const router = useRouter();

// Redirect to homepage or another page
const redirectToHome = () => {
	router.push("/");
};
</script>

<template>
	<section
		class="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white"
	>
		<u-card class="max-w-lg mx-auto p-6 bg-neutral-800 rounded-lg">
			<h1 class="text-3xl font-semibold text-neutral-100">
				Dashboard - Coming Soon
			</h1>
			<p class="mt-4 text-lg text-neutral-400">
				This page is currently under construction. We're working hard to
				bring you the features you've been waiting for.
			</p>
			<p class="mt-4 text-lg text-neutral-400">
				Check back soon for updates!
			</p>

			<div class="mt-6">
				<!-- Redirect to homepage or another page -->
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
