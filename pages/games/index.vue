<template>
	<div class="container mx-auto px-4 py-8">
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-2xl sm:text-3xl font-bold">My Groups</h1>
				<p class="text-gray-600 mt-2">
					Play daily social games with your friends
				</p>
			</div>
			<UButton
				to="/games/new"
				size="lg"
				icon="i-heroicons-plus"
			>
				Create Group
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
		<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<UCard
				v-for="group in groups"
				:key="group.id"
				class="hover:shadow-lg transition-shadow cursor-pointer"
				@click="navigateTo(`/games/${group.id}`)"
			>
				<template #header>
					<div class="flex items-center gap-3">
						<UAvatar
							:src="group.avatar_url"
							:alt="group.name"
							size="lg"
						/>
						<div class="flex-1">
							<h3 class="font-semibold text-lg">{{ group.name }}</h3>
							<p class="text-sm text-gray-600">
								{{ group.member_count }} {{ group.member_count === 1 ? 'member' : 'members' }}
							</p>
						</div>
					</div>
				</template>

				<p v-if="group.description" class="text-gray-700 line-clamp-2">
					{{ group.description }}
				</p>
				<p v-else class="text-gray-400 italic">
					No description
				</p>

				<template #footer>
					<div class="flex justify-between items-center text-sm">
						<div class="flex items-center gap-4">
							<span class="text-gray-600">
								<UIcon name="i-heroicons-puzzle-piece" class="w-4 h-4 inline" />
								{{ group.active_games_count || 0 }} active
							</span>
							<span class="text-gray-600">
								<UIcon name="i-heroicons-trophy" class="w-4 h-4 inline" />
								{{ group.total_games_count || 0 }} total
							</span>
						</div>
						<UButton
							size="xs"
							variant="ghost"
							trailing-icon="i-heroicons-arrow-right"
							@click.stop="navigateTo(`/games/${group.id}`)"
						>
							View
						</UButton>
					</div>
				</template>
			</UCard>
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
