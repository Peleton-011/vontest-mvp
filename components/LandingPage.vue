<template>
	<section
		class="relative flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white"
	>
		<!-- Hero Section (without image) -->
		<div class="relative z-10 text-center px-6 py-12 sm:px-12 sm:py-24">
			<UCard class="mx-auto p-6 bg-neutral-800 rounded-lg">
				<template #header>
					<h1 class="text-4xl font-semibold text-neutral-100">
						Vontests: Where Practical Decisions Emerge
					</h1>
				</template>

				<p class="mt-4 text-lg text-neutral-400">
					Rooted in Peirce’s Pragmatic Maxim, Vontests empowers you to
					make decisions that matter.
				</p>

				<template #footer>
					<div class="flex flex-col h-20 justify-center gap-4">
						<!-- Conditional Buttons with Icons -->
						<NuxtLink v-if="!user" to="/login" class="w-full">
							<UButton size="lg" block class="font-bold">
								Login
								<UIcon name="i-lucide-log-in" class="ml-2" />
							</UButton>
						</NuxtLink>
						<NuxtLink v-if="!user" to="/signup" class="w-full">
							<UButton size="lg" block class="font-bold">
								Sign Up
								<UIcon name="i-lucide-user-plus" class="ml-2" />
							</UButton>
						</NuxtLink>
						<NuxtLink v-if="user" to="/dashboard" class="w-full">
							<UButton variant="tertiary" size="lg" block class="font-bold">
								Go to Dashboard
								<UIcon name="i-lucide-arrow-right" class="ml-2" />
							</UButton>
						</NuxtLink>
					</div>
				</template>
			</UCard>
		</div>

		<!-- Features Section with Icons -->
		<div class="mt-16 max-w-7xl mx-auto px-6 sm:px-12">
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
				<UCard class="flex flex-col items-center text-center bg-neutral-800">
					<UIcon
						name="i-lucide-lightbulb"
						class="h-12 w-12 text-primary-500"
					/>
					<h2 class="mt-4 text-xl font-semibold text-neutral-100">
						Pose Real-World Questions
					</h2>
					<p class="mt-2 text-neutral-400">
						Engage with issues that impact your world.
					</p>
				</UCard>

				<UCard class="flex flex-col items-center text-center bg-neutral-800">
					<UIcon
						name="i-lucide-message-square"
						class="h-12 w-12 text-primary-500"
					/>
					<h2 class="mt-4 text-xl font-semibold text-neutral-100">
						Debate with Evidence
					</h2>
					<p class="mt-2 text-neutral-400">
						Discuss options backed by real-world outcomes.
					</p>
				</UCard>

				<UCard class="flex flex-col items-center text-center bg-neutral-800">
					<UIcon
						name="i-lucide-check-circle"
						class="h-12 w-12 text-primary-500"
					/>
					<h2 class="mt-4 text-xl font-semibold text-neutral-100">
						Select the Better Option
					</h2>
					<p class="mt-2 text-neutral-400">
						Make decisions that are pragmatically superior.
					</p>
				</UCard>
			</div>
		</div>
	</section>
</template>

<script setup>
const user = useSupabaseUser();
</script>