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

// Mobile menu state
const showMobileMenu = ref(false);

// Fetch profile when component mounts if user is logged in
onMounted(async () => {
	if (user.value) {
		await fetchProfile();
	}
});

// Watch for user changes and refetch profile
watch(user, async (newUser) => {
	if (newUser) {
		await fetchProfile();
	}
});
</script>

<template>
	<nav class="w-full bg-neutral-900 text-white shadow-md">
		<!-- Desktop Nav -->
		<div class="hidden md:block">
			<div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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
							:key="profile?.avatar_url"
							:src="profile?.avatar_url"
							:alt="profile?.username || user?.email || 'User'"
							size="md"
							class="transition-transform hover:scale-110 cursor-pointer"
						/>
					</button>

					<ProfileModal v-model:open="showProfileModal" />
				</template>
			</div>
		</div>
	</div>

	<!-- Mobile Nav -->
	<div class="md:hidden">
		<div class="px-4 py-3 flex items-center justify-between">
			<!-- Logo/Home -->
			<NuxtLink to="/" class="text-xl font-bold hover:text-primary-400 transition">
				VonTest
			</NuxtLink>

			<!-- Right side -->
			<div class="flex items-center gap-3">
				<!-- Profile Avatar -->
				<button
					v-if="user"
					@click="showProfileModal = true"
					class="focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full"
					aria-label="Open profile"
				>
					<UAvatar
						:key="profile?.avatar_url"
						:src="profile?.avatar_url"
						:alt="profile?.username || user?.email || 'User'"
						size="sm"
						class="transition-transform active:scale-95 cursor-pointer"
					/>
				</button>

				<!-- Hamburger Menu -->
				<button
					@click="showMobileMenu = true"
					class="p-2 hover:bg-neutral-800 rounded-lg transition touch-target"
					aria-label="Open menu"
				>
					<UIcon name="i-heroicons-bars-3" class="w-6 h-6" />
				</button>
			</div>
		</div>
	</div>

	<!-- Mobile Menu Modal -->
	<UModal v-model="showMobileMenu" :ui="{ width: 'max-w-sm' }">
		<div class="p-6 space-y-6">
			<h2 class="text-xl font-bold">Menu</h2>

			<nav class="space-y-2">
				<NuxtLink
					to="/"
					class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-neutral-800 transition"
					@click="showMobileMenu = false"
				>
					<UIcon name="i-heroicons-home" class="w-5 h-5" />
					<span class="font-semibold">Home</span>
				</NuxtLink>

				<NuxtLink
					v-if="user"
					to="/dashboard"
					class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-neutral-800 transition"
					@click="showMobileMenu = false"
				>
					<UIcon name="i-heroicons-chart-bar" class="w-5 h-5" />
					<span class="font-semibold">Dashboard</span>
				</NuxtLink>

				<NuxtLink
					v-if="user"
					to="/games"
					class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-neutral-800 transition"
					@click="showMobileMenu = false"
				>
					<UIcon name="i-heroicons-puzzle-piece" class="w-5 h-5" />
					<span class="font-semibold">Games</span>
				</NuxtLink>
			</nav>

			<!-- Auth buttons if not logged in -->
			<div v-if="!user" class="space-y-3 pt-4 border-t border-neutral-800">
				<UButton block to="/login" @click="showMobileMenu = false">
					<UIcon name="i-lucide-log-in" class="mr-2" />
					Login
				</UButton>
				<UButton block variant="outline" to="/signup" @click="showMobileMenu = false">
					<UIcon name="i-lucide-user-plus" class="mr-2" />
					Sign Up
				</UButton>
			</div>
		</div>
	</UModal>

	<!-- Profile Modal (shared by desktop and mobile) -->
	<ProfileModal v-model:open="showProfileModal" />
	</nav>
</template>
