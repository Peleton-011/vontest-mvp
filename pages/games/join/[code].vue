<template>
	<div class="container mx-auto px-4 py-8 max-w-2xl">
		<!-- Loading state -->
		<div v-if="loading" class="text-center py-12">
			<UIcon name="i-heroicons-arrow-path" class="w-12 h-12 animate-spin mx-auto" />
			<p class="mt-4 text-gray-400">Loading group...</p>
		</div>

		<!-- Error state -->
		<UAlert
			v-else-if="error || groupPreview?.error"
			color="error"
			variant="soft"
			title="Invalid Invite Link"
			:description="error?.message || groupPreview?.error || 'This invite link is invalid or expired'"
			class="mb-6"
		>
			<template #actions>
				<UButton to="/games" variant="outline">
					View My Groups
				</UButton>
			</template>
		</UAlert>

		<!-- Group preview -->
		<UCard v-else-if="groupPreview && !groupPreview.error">
			<template #header>
				<div class="text-center">
					<h1 class="text-2xl sm:text-3xl font-bold">You've been invited!</h1>
					<p class="text-gray-400 mt-2">
						Join this group to start playing daily games
					</p>
				</div>
			</template>

			<div class="space-y-6">
				<!-- Group Info -->
				<div class="text-center py-6 bg-neutral-950 rounded-lg">
					<UIcon name="i-heroicons-user-group" class="w-16 h-16 mx-auto text-gray-50 mb-4" />
					<h2 class="text-2xl font-semibold">{{ groupPreview.group_name }}</h2>
					<p v-if="groupPreview.group_description" class="text-gray-400 mt-2">
						{{ groupPreview.group_description }}
					</p>
					<div class="flex justify-center gap-6 mt-4 text-sm text-gray-400">
						<span>
							<UIcon name="i-heroicons-users" class="w-4 h-4 inline" />
							{{ groupPreview.member_count }} {{ groupPreview.member_count === 1 ? 'member' : 'members' }}
						</span>
					</div>
				</div>

				<!-- Invite Code Stats -->
				<div class="text-sm text-gray-400 text-center space-y-1">
					<p v-if="groupPreview.expires_at">
						<UIcon name="i-heroicons-clock" class="w-4 h-4 inline" />
						Expires {{ formatDate(groupPreview.expires_at) }}
					</p>
					<p v-if="groupPreview.max_uses">
						<UIcon name="i-heroicons-ticket" class="w-4 h-4 inline" />
						{{ groupPreview.uses_count }} / {{ groupPreview.max_uses }} uses
					</p>
				</div>

				<!-- Join Button -->
				<div class="text-center">
					<UButton
						size="xl"
						:loading="joiningLoading"
						:disabled="joiningLoading"
						icon="i-heroicons-check-circle"
						@click="handleJoin"
					>
						Join Group
					</UButton>
				</div>

				<!-- Already a member -->
				<UAlert
					v-if="joinError"
					color="info"
					variant="soft"
					:description="joinError"
					class="mt-4"
				>
					<template #actions>
						<UButton v-if="joinResult?.group_id" :to="`/games/${joinResult.group_id}`" variant="outline">
							Go to Group
						</UButton>
					</template>
				</UAlert>
			</div>
		</UCard>
	</div>
</template>

<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'default',
});

const route = useRoute();
const code = computed(() => route.params.code as string);

const { getGroupPreview, joinViaCode, loading, error } = useInviteCodes();

const groupPreview = ref<any>(null);
const joiningLoading = ref(false);
const joinError = ref<string | null>(null);
const joinResult = ref<any>(null);

// Format date helper
const formatDate = (dateString: string) => {
	const date = new Date(dateString);
	const now = new Date();
	const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

	if (diffInDays < 0) return 'Expired';
	if (diffInDays === 0) return 'Today';
	if (diffInDays === 1) return 'Tomorrow';
	if (diffInDays < 7) return `in ${diffInDays} days`;
	return date.toLocaleDateString();
};

// Handle join
const handleJoin = async () => {
	joiningLoading.value = true;
	joinError.value = null;

	const result = await joinViaCode(code.value);
	joinResult.value = result;

	if (result.success) {
		// Success! Redirect to group
		setTimeout(() => {
			navigateTo(`/games/${result.group_id}`);
		}, 500);
	} else {
		joinError.value = result.error || 'Failed to join group';
	}

	joiningLoading.value = false;
};

// Fetch group preview on mount
onMounted(async () => {
	groupPreview.value = await getGroupPreview(code.value);
});
</script>
