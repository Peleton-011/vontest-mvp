<script setup lang="ts">
const user = useSupabaseUser();
const route = useRoute();
const { profile, fetchProfile } = useProfile();

const breakpoints = useBreakpoints({
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
});

const isMobile = breakpoints.smaller("md");

// Profile modal state
const showProfileModal = ref(false);

// Fetch profile when component mounts if user is logged in
onMounted(async () => {
	if (user.value) {
		await fetchProfile();
	}
});
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
					to="/dashboard"
					class="text-lg font-semibold hover:text-primary-400 transition"
				>
					Dashboard
				</NuxtLink>
				<NuxtLink
					v-if="user"
					to="/games"
					class="text-lg font-semibold hover:text-primary-400 transition"
				>
					Games
				</NuxtLink>
				<NuxtLink
					v-if="user && !isMobile && false"
					to="/protected"
					class="text-lg font-semibold hover:text-primary-400 transition"
				>
					Protected
				</NuxtLink>
				<NuxtLink
					v-if="user && !isMobile && false"
					to="/updates"
					class="text-lg font-semibold hover:text-primary-400 transition"
				>
					Updates
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
					<button
						@click="showProfileModal = true"
						class="focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full"
						aria-label="Open profile"
					>
						<UAvatar
							:src="profile?.avatar_url || ''"
							:alt="profile?.username || user?.email || 'User'"
							size="md"
							class="transition-transform hover:scale-110 cursor-pointer"
						/>
					</button>

					<ProfileModal v-model:open="showProfileModal" />
				</template>
			</div>
		</div>
	</nav>
</template>
