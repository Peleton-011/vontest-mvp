<template>
	<div class="container mx-auto px-3 md:px-4 py-4 md:py-8">
		<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
			<div class="flex-1">
				<h1 class="text-xl md:text-3xl font-bold">My Groups</h1>
				<p class="text-sm md:text-base text-gray-600 mt-1 md:mt-2">
					Play daily social games with your friends
				</p>
			</div>
			<UButton
				to="/games/new"
				size="md"
				class="sm:size-lg w-full sm:w-auto touch-target"
				icon="i-heroicons-plus"
			>
				<span class="sm:inline">Create Group</span>
			</UButton>
		</div>

		<!-- Loading state -->
		<UiLoading v-if="loading" message="Loading groups..." />

		<!-- Error state -->
		<UAlert
			v-else-if="error"
			color="red"
			variant="soft"
			title="Error loading groups"
			:description="error.message"
			class="mb-6"
		/>

		<!-- Empty state -->
		<UiEmptyState
			v-else-if="groups.length === 0"
			icon="i-heroicons-user-group"
			title="No groups yet"
			description="Create your first group to start playing daily games with friends"
		>
			<template #action>
				<UButton
					to="/games/new"
					size="lg"
					icon="i-heroicons-plus"
				>
					Create Your First Group
				</UButton>
			</template>
		</UiEmptyState>

		<!-- Groups grid -->
		<div v-else class="grid grid-cols-1 gap-6">
			<NuxtLink
				v-for="group in groups"
				:key="group.id"
				:to="`/games/${group.id}`"
				class="group focus:outline-none"
			>
				<UCard
					class="h-full hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group-focus-visible:ring-2 group-focus-visible:ring-primary-500"
				>
					<template #header>
						<div class="flex items-center gap-3">
							<UAvatar
								:src="group.avatar_url"
								:alt="`${group.name} group avatar`"
								size="lg"
							/>
							<div class="flex-1">
								<h3 class="font-semibold text-lg group-hover:text-primary-600 transition-colors">
									{{ group.name }}
								</h3>
								<p class="text-sm text-gray-400 dark:text-gray-400">
									{{ group.member_count }} {{ group.member_count === 1 ? 'member' : 'members' }}
								</p>
							</div>
						</div>
					</template>

					<p v-if="group.description" class="text-gray-600 dark:text-gray-300 line-clamp-2">
						{{ group.description }}
					</p>
					<p v-else class="text-gray-500 dark:text-gray-500 italic">
						No description
					</p>

					<template #footer>
						<div class="flex justify-between items-center text-sm">
							<div class="flex items-center gap-4">
								<span class="text-gray-500 dark:text-gray-400" :title="`${group.active_games_count || 0} active games`">
									<UIcon name="i-heroicons-puzzle-piece" class="w-4 h-4 inline" aria-hidden="true" />
									{{ group.active_games_count || 0 }} active
								</span>
								<span class="text-gray-500 dark:text-gray-400" :title="`${group.total_games_count || 0} total games played`">
									<UIcon name="i-heroicons-trophy" class="w-4 h-4 inline" aria-hidden="true" />
									{{ group.total_games_count || 0 }} total
								</span>
							</div>
							<span class="text-primary-600 group-hover:text-primary-500 transition-colors font-medium flex items-center gap-1">
								View
								<UIcon name="i-heroicons-arrow-right" class="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
							</span>
						</div>
					</template>
				</UCard>
			</NuxtLink>
		</div>
	</div>
</template>

<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'default',
});

const { groups, loading, error, fetchGroups } = useGroups();

// Ensure groups are fresh
onMounted(() => {
	fetchGroups();
});
</script>
