<script setup lang="ts">
const user = useSupabaseUser();
const route = useRoute();
</script>

<template>
	<nav class="w-full bg-neutral-900 text-white shadow-md">
		<div
			class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between"
		>
			<!-- Left side links -->
			<div class="flex items-center space-x-6">
				<NuxtLink
					to="/"
					class="text-lg font-semibold hover:text-primary-400 transition"
				>
					Home
				</NuxtLink>
				<NuxtLink
					v-if="user"
					to="/protected"
					class="text-lg font-semibold hover:text-primary-400 transition"
				>
					Protected
				</NuxtLink>
			</div>

			<!-- Right side buttons -->
			<div class="flex items-center space-x-4">
				<template v-if="!user && route.path !== '/'">
					<NuxtLink to="/login">
						<UButton class="font-bold">
							Login
							<UIcon name="i-lucide-log-in" class="ml-2" />
						</UButton>
					</NuxtLink>
					<NuxtLink to="/signup">
						<UButton class="font-bold">
							Sign Up
							<UIcon name="i-lucide-user-plus" class="ml-2" />
						</UButton>
					</NuxtLink>
				</template>
				<template v-else-if="user">
                    <NuxtLink to="/logout">
						<UButton class="font-bold" variant="outline">
							Log Out
							<UIcon name="i-lucide-log-out" class="ml-2" />
						</UButton>
					</NuxtLink>
				</template>
			</div>
		</div>
	</nav>
</template>
