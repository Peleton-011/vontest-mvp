<template>
	<div class="container mx-auto px-4 py-8">
		<div class="mb-8">
			<UButton
				to="/games"
				variant="ghost"
				icon="i-heroicons-arrow-left"
				class="mb-4"
			>
				Back to Groups
			</UButton>
		</div>

		<!-- Loading state -->
		<div v-if="loading" class="text-center py-12">
			<UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin mx-auto" />
			<p class="mt-4 text-gray-600">Loading group...</p>
		</div>

		<!-- Error state -->
		<UAlert
			v-else-if="error"
			color="error"
			variant="soft"
			title="Error loading group"
			:description="error.message"
			class="mb-6"
		/>

		<!-- Group not found -->
		<div v-else-if="!group" class="text-center py-12">
			<UIcon name="i-heroicons-exclamation-triangle" class="w-16 h-16 mx-auto text-gray-400" />
			<h3 class="text-xl font-semibold mt-4">Group not found</h3>
			<p class="text-gray-600 mt-2">
				This group doesn't exist or you don't have access to it
			</p>
			<UButton
				to="/games"
				class="mt-6"
			>
				Back to Groups
			</UButton>
		</div>

		<!-- Group content -->
		<div v-else>
			<!-- Group Header -->
			<div class="flex items-start gap-6 mb-8">
				<UAvatar
					:src="group.avatar_url"
					:alt="group.name"
					size="2xl"
				/>
				<div class="flex-1">
					<h1 class="text-3xl font-bold">{{ group.name }}</h1>
					<p v-if="group.description" class="text-gray-600 mt-2">
						{{ group.description }}
					</p>
					<div class="flex gap-4 mt-4 text-sm text-gray-600">
						<span>
							<UIcon name="i-heroicons-users" class="w-4 h-4 inline" />
							{{ memberCount }} {{ memberCount === 1 ? 'member' : 'members' }}
						</span>
						<span v-if="isAdmin" class="text-green-600">
							<UIcon name="i-heroicons-shield-check" class="w-4 h-4 inline" />
							Admin
						</span>
					</div>
				</div>
				<div class="flex gap-2">
					<UButton
						v-if="isAdmin"
						variant="outline"
						icon="i-heroicons-cog-6-tooth"
					>
						Settings
					</UButton>
					<UButton
						v-if="!isAdmin"
						variant="outline"
						color="error"
						icon="i-heroicons-arrow-right-on-rectangle"
						@click="handleLeave"
					>
						Leave Group
					</UButton>
				</div>
			</div>

			<!-- Tabs -->
			<UTabs :items="tabs" class="mb-8">
				<!-- Games Tab -->
				<template #games>
					<div class="py-6">
						<div class="text-center py-12">
							<UIcon name="i-heroicons-puzzle-piece" class="w-16 h-16 mx-auto text-gray-400" />
							<h3 class="text-xl font-semibold mt-4">No active game</h3>
							<p class="text-gray-600 mt-2">
								The next game will be created at {{ settings.notification_time }}
							</p>
						</div>
					</div>
				</template>

				<!-- Members Tab -->
				<template #members>
					<div class="py-6">
						<div class="flex justify-between items-center mb-6">
							<h3 class="text-lg font-semibold">
								Members ({{ memberCount }})
							</h3>
						</div>

						<div class="space-y-3">
							<UCard
								v-for="member in members"
								:key="member.user_id"
								class="flex items-center justify-between p-4"
							>
								<div class="flex items-center gap-3">
									<UAvatar
										:src="member.avatar_url"
										:alt="member.username || 'User'"
										size="md"
									/>
									<div>
										<p class="font-medium">{{ member.username || 'Unknown User' }}</p>
										<p class="text-sm text-gray-600">
											{{ member.role === 'admin' ? '👑 Admin' : 'Member' }}
											• {{ member.games_played }} games • {{ member.total_score }} pts
										</p>
									</div>
								</div>
							</UCard>
						</div>
					</div>
				</template>

				<!-- Invite Tab -->
				<template #invite>
					<div class="py-6 space-y-6">
						<!-- Create Invite Section -->
						<div v-if="isAdmin">
							<div class="flex justify-between items-center mb-4">
								<div>
									<h3 class="text-lg font-semibold">Invite Links</h3>
									<p class="text-sm text-gray-600">Share these links to invite friends</p>
								</div>
								<UButton
									icon="i-heroicons-plus"
									:loading="inviteLoading"
									@click="handleCreateInvite"
								>
									New Invite Link
								</UButton>
							</div>
						</div>

						<!-- Active Invite Codes -->
						<div v-if="activeInviteCodes.length > 0">
							<h4 class="text-sm font-semibold text-gray-700 mb-3">Active Invites</h4>
							<div class="space-y-3">
								<UCard
									v-for="code in activeInviteCodes"
									:key="code.id"
									class="p-4"
								>
									<div class="space-y-3">
										<div class="flex justify-between items-start">
											<div class="flex-1">
												<p class="font-mono text-lg font-semibold">{{ code.code }}</p>
												<p class="text-sm text-gray-600 mt-1">
													Created {{ new Date(code.created_at).toLocaleDateString() }}
													<span v-if="code.expires_at">
														• Expires {{ new Date(code.expires_at).toLocaleDateString() }}
													</span>
												</p>
												<p class="text-sm text-gray-600">
													<UIcon name="i-heroicons-ticket" class="w-4 h-4 inline" />
													{{ code.uses_count }} {{ code.max_uses ? `/ ${code.max_uses}` : '' }} uses
												</p>
											</div>
											<div class="flex gap-2">
												<UButton
													size="sm"
													icon="i-heroicons-clipboard-document"
													@click="handleCopyLink(code.code)"
												>
													Copy Link
												</UButton>
												<UButton
													v-if="isAdmin"
													size="sm"
													color="error"
													variant="ghost"
													icon="i-heroicons-x-mark"
													@click="handleDeactivate(code.code)"
												/>
											</div>
										</div>
										<div class="bg-gray-50 p-3 rounded text-xs font-mono break-all">
											{{ getInviteLink(code.code) }}
										</div>
									</div>
								</UCard>
							</div>
						</div>

						<!-- Empty State -->
						<div v-else class="text-center py-12">
							<UIcon name="i-heroicons-link" class="w-16 h-16 mx-auto text-gray-400" />
							<h3 class="text-xl font-semibold mt-4">No active invite links</h3>
							<p class="text-gray-600 mt-2">
								{{ isAdmin ? 'Create an invite link to share with friends' : 'Ask an admin to create an invite link' }}
							</p>
							<UButton
								v-if="isAdmin"
								class="mt-6"
								icon="i-heroicons-plus"
								@click="handleCreateInvite"
							>
								Create Invite Link
							</UButton>
						</div>
					</div>
				</template>
			</UTabs>
		</div>
	</div>
</template>

<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'default',
});

const route = useRoute();
const groupId = computed(() => route.params.groupId as string);

const { fetchGroup, loading: groupLoading, error: groupError } = useGroups();
const { members, memberCount, isAdmin, loading: membersLoading, error: membersError, leaveGroup } = useGroupMembers(groupId);
const { inviteCodes, activeInviteCodes, createInviteCode, deactivateCode, getInviteLink, copyInviteLink, loading: inviteLoading } = useInviteCodes(groupId);

const group = ref<any>(null);
const loading = computed(() => groupLoading.value || membersLoading.value);
const error = computed(() => groupError.value || membersError.value);

const settings = computed(() => {
	if (!group.value?.settings) return { notification_time: '09:00' };
	return group.value.settings;
});

const tabs = [
	{
		slot: 'games',
		label: 'Games',
		icon: 'i-heroicons-puzzle-piece',
	},
	{
		slot: 'members',
		label: 'Members',
		icon: 'i-heroicons-users',
	},
	{
		slot: 'invite',
		label: 'Invite',
		icon: 'i-heroicons-link',
	},
];

const handleLeave = async () => {
	if (confirm('Are you sure you want to leave this group?')) {
		const success = await leaveGroup();
		if (success) {
			navigateTo('/games');
		}
	}
};

const handleCreateInvite = async () => {
	const code = await createInviteCode();
	if (code) {
		// Success! Code will appear in the list
		console.log('Created invite code:', code);
	}
};

const handleCopyLink = async (code: string) => {
	const success = await copyInviteLink(code);
	if (success) {
		// TODO: Show toast notification
		alert('Invite link copied to clipboard!');
	}
};

const handleDeactivate = async (code: string) => {
	if (confirm('Are you sure you want to deactivate this invite link?')) {
		await deactivateCode(code);
	}
};

// Fetch group data
onMounted(async () => {
	group.value = await fetchGroup(groupId.value);
});
</script>
