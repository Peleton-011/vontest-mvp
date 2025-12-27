<template>
	<div class="container mx-auto px-3 md:px-4 py-4 md:py-8 pb-20 md:pb-8">
		<!-- Mobile Back Button -->
		<div class="md:hidden mb-4">
			<UButton
				to="/games"
				variant="ghost"
				icon="i-heroicons-arrow-left"
				size="md"
				class="touch-target"
			>
				Groups
			</UButton>
		</div>

		<!-- Desktop Back Button -->
		<div class="hidden md:block mb-8">
			<UButton
				to="/games"
				variant="ghost"
				icon="i-heroicons-arrow-left"
			>
				Back to Groups
			</UButton>
		</div>

		<!-- Loading state -->
		<div v-if="loading" class="text-center py-12">
			<UIcon
				name="i-heroicons-arrow-path"
				class="w-8 h-8 animate-spin mx-auto"
			/>
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
			<UIcon
				name="i-heroicons-exclamation-triangle"
				class="w-16 h-16 mx-auto text-gray-400"
			/>
			<h3 class="text-xl font-semibold mt-4">Group not found</h3>
			<p class="text-gray-600 mt-2">
				This group doesn't exist or you don't have access to it
			</p>
			<UButton to="/games" class="mt-6"> Back to Groups </UButton>
		</div>

		<!-- Group content -->
		<div v-else>
			<!-- Mobile Group Header -->
			<div class="md:hidden mb-4 bg-neutral-800 rounded-lg p-4">
				<div class="flex items-center gap-3 mb-3">
					<UAvatar :src="group.avatar_url" :alt="group.name" size="lg" />
					<div class="flex-1 min-w-0">
						<h1 class="text-xl font-bold truncate">{{ group.name }}</h1>
						<p class="text-sm text-gray-400">
							{{ memberCount }} {{ memberCount === 1 ? "member" : "members" }}
							<span v-if="isAdmin" class="text-green-500 ml-2">• Admin</span>
						</p>
					</div>
					<UButton
						variant="ghost"
						icon="i-heroicons-ellipsis-vertical"
						size="sm"
						@click="showMobileMenu = true"
					/>
				</div>
				<p v-if="group.description" class="text-sm text-gray-300 line-clamp-2">
					{{ group.description }}
				</p>
			</div>

			<!-- Desktop Group Header -->
			<div class="hidden md:flex items-start gap-6 mb-8">
				<UAvatar :src="group.avatar_url" :alt="group.name" size="2xl" />
				<div class="flex-1">
					<h1 class="text-2xl sm:text-3xl font-bold">{{ group.name }}</h1>
					<p v-if="group.description" class="text-gray-600 mt-2">
						{{ group.description }}
					</p>
					<div class="flex gap-4 mt-4 text-sm text-gray-600">
						<span>
							<UIcon
								name="i-heroicons-users"
								class="w-4 h-4 inline"
							/>
							{{ memberCount }}
							{{ memberCount === 1 ? "member" : "members" }}
						</span>
						<span v-if="isAdmin" class="text-green-600">
							<UIcon
								name="i-heroicons-shield-check"
								class="w-4 h-4 inline"
							/>
							Admin
						</span>
					</div>
				</div>
				<div class="flex gap-2">
					<UButton
						v-if="isAdmin"
						variant="outline"
						icon="i-heroicons-cog-6-tooth"
						:to="`/games/${groupId}/settings`"
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

			<!-- Desktop Tabs -->
			<UTabs v-model="activeTab" :items="tabs" class="hidden md:block mb-8">
				<!-- Games Tab -->
				<template #games>
					<div class="py-4 md:py-6">
						<!-- Mobile Admin Controls -->
						<div v-if="isAdmin" class="md:hidden mb-4 space-y-3">
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-lg font-semibold">Daily Games</h3>
									<p class="text-xs text-gray-400">
										Auto at {{ settings.notification_time }}
									</p>
								</div>
							</div>
							<div class="grid grid-cols-2 gap-2">
								<UButton
									block
									size="md"
									icon="i-heroicons-sparkles"
									:loading="gameSchedulerLoading"
									@click="handleStartGameNow"
								>
									Start Now
								</UButton>
								<UButton
									block
									size="md"
									variant="outline"
									icon="i-heroicons-pencil"
									@click="handleOpenCustomGame"
								>
									Custom
								</UButton>
							</div>
							<GamesManagePromptsModal :group-id="groupId" button-block />
						</div>

						<!-- Desktop Admin Controls -->
						<div v-if="isAdmin" class="hidden md:flex mb-6 justify-between items-center">
							<div>
								<h3 class="text-lg font-semibold">Daily Games</h3>
								<p class="text-sm text-gray-600">
									Auto-created at {{ settings.notification_time }} ({{ settings.timezone }})
								</p>
							</div>
							<div class="flex gap-3">
								<UButton
									size="md"
									icon="i-heroicons-sparkles"
									:loading="gameSchedulerLoading"
									@click="handleStartGameNow"
								>
									Start Game Now
								</UButton>
								<UButton
									size="md"
									variant="outline"
									icon="i-heroicons-pencil"
									@click="handleOpenCustomGame"
								>
									Make Custom Game
								</UButton>
								<GamesManagePromptsModal :group-id="groupId" />
							</div>
						</div>

						<!-- Active Game -->
						<div v-if="activeGame">
							<GamesWouldYouRatherGame
								v-if="activeGame.game_type === 'would_you_rather'"
								:group-id="groupId"
							/>
							<GamesHotTakesGame
								v-else-if="activeGame.game_type === 'hot_takes'"
								:group-id="groupId"
							/>
							<GamesGuessWhoSaidItGame
								v-else-if="activeGame.game_type === 'guess_who_said_it'"
								:group-id="groupId"
							/>
							<GamesMostLikelyToGame
								v-else-if="activeGame.game_type === 'most_likely_to'"
								:group-id="groupId"
							/>
							<GamesTwoTruthsRouletteGame
								v-else-if="activeGame.game_type === 'two_truths_roulette'"
								:group-id="groupId"
							/>
							<GamesPredictYourFriendsGame
								v-else-if="activeGame.game_type === 'predict_your_friends'"
								:group-id="groupId"
							/>
							<GamesDinnerPartyDilemmasGame
								v-else-if="activeGame.game_type === 'dinner_party_dilemmas'"
								:group-id="groupId"
							/>
							<GamesComplimentEconomyGame
								v-else-if="activeGame.game_type === 'compliment_economy'"
								:group-id="groupId"
							/>
							<GamesBracketBattleGame
								v-else-if="activeGame.game_type === 'bracket_battle'"
								:group-id="groupId"
							/>
							<div v-else class="text-center py-12">
								<UIcon
									name="i-heroicons-puzzle-piece"
									class="w-16 h-16 mx-auto text-gray-400"
								/>
								<h3 class="text-xl font-semibold mt-4">
									{{ activeGame.game_type }}
								</h3>
								<p class="text-gray-600 mt-2">
									This game type is not yet implemented
								</p>
							</div>
						</div>

						<!-- No Active Game -->
						<div v-else class="text-center py-12">
							<UIcon
								name="i-heroicons-puzzle-piece"
								class="w-16 h-16 mx-auto text-gray-400"
							/>
							<h3 class="text-xl font-semibold mt-4">
								No active game
							</h3>
							<p class="text-gray-600 mt-2">
								The next game will be created at
								{{ settings.notification_time }}
							</p>
							<p v-if="isAdmin" class="text-sm text-gray-500 mt-1">
								Or click "Create Game Now" above to start one manually
							</p>
						</div>
					</div>
				</template>

				<!-- Chat Tab -->
				<template #chat>
					<div class="py-6">
						<!-- Loading State -->
						<div v-if="!chatThreadId" class="text-center py-12">
							<UIcon
								name="i-heroicons-arrow-path"
								class="w-8 h-8 animate-spin mx-auto"
							/>
							<p class="mt-4 text-gray-600">Loading chat...</p>
						</div>

						<!-- Chat Component -->
						<UiChatSection v-else :thread-id="chatThreadId" />
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
								class="p-4"
							>
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-3">
										<UAvatar
											:src="member.avatar_url"
											:alt="member.username || 'User'"
											size="md"
										/>
										<div>
											<p class="font-medium">
												{{
													member.username ||
													"Unknown User"
												}}
												<span
													v-if="member.user_id === user?.id"
													class="text-xs text-gray-500"
												>
													(You)
												</span>
											</p>
											<p class="text-sm text-gray-600">
												{{
													member.role === "admin"
														? "👑 Admin"
														: "Member"
												}}
												• {{ member.games_played }} games •
												{{ member.total_score }} pts
											</p>
										</div>
									</div>

									<!-- Member Actions (Admin Only) -->
									<UDropdownMenu
										v-if="isAdmin && member.user_id !== user?.id"
										:items="getMemberActions(member)"
										:content="{
											align: 'end',
											side: 'bottom',
											sideOffset: 8,
										}"
									>
										<UButton
											variant="ghost"
											color="neutral"
											icon="i-heroicons-ellipsis-vertical"
										/>
									</UDropdownMenu>
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
									<h3 class="text-lg font-semibold">
										Invite Links
									</h3>
									<p class="text-sm text-gray-600">
										Share these links to invite friends
									</p>
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
							<h4
								class="text-sm font-semibold text-gray-700 mb-3"
							>
								Active Invites
							</h4>
							<div class="space-y-3">
								<UCard
									v-for="code in activeInviteCodes"
									:key="code.id"
									class="p-4"
								>
									<div class="space-y-3">
										<div
											class="flex justify-between items-start"
										>
											<div class="flex-1">
												<p
													class="font-mono text-lg font-semibold"
												>
													{{ code.code }}
												</p>
												<p
													class="text-sm text-gray-600 mt-1"
												>
													Created
													{{
														new Date(
															code.created_at
														).toLocaleDateString()
													}}
													<span
														v-if="code.expires_at"
													>
														• Expires
														{{
															new Date(
																code.expires_at
															).toLocaleDateString()
														}}
													</span>
												</p>
												<p
													class="text-sm text-gray-600"
												>
													<UIcon
														name="i-heroicons-ticket"
														class="w-4 h-4 inline"
													/>
													{{ code.uses_count }}
													{{
														code.max_uses
															? `/ ${code.max_uses}`
															: ""
													}}
													uses
												</p>
											</div>
											<div class="flex gap-2">
												<UButton
													size="sm"
													icon="i-heroicons-clipboard-document"
													@click="
														handleCopyLink(
															code.code
														)
													"
												>
													Copy Link
												</UButton>
												<UButton
													v-if="isAdmin"
													size="sm"
													color="error"
													variant="ghost"
													icon="i-heroicons-x-mark"
													@click="
														handleDeactivate(
															code.code
														)
													"
												/>
											</div>
										</div>
										<div
											class="bg-gray-50 p-3 rounded text-xs font-mono break-all"
										>
											{{ getInviteLink(code.code) }}
										</div>
									</div>
								</UCard>
							</div>
						</div>

						<!-- Empty State -->
						<UiEmptyState
							v-else
							icon="i-heroicons-link"
							title="No active invite links"
							:description="isAdmin ? 'Create an invite link to share with friends' : 'Ask an admin to create an invite link'"
						>
							<template v-if="isAdmin" #action>
								<UButton
									icon="i-heroicons-plus"
									@click="handleCreateInvite"
								>
									Create Invite Link
								</UButton>
							</template>
						</UiEmptyState>
					</div>
				</template>
			</UTabs>

			<!-- Mobile Tab Content (conditional rendering based on activeTab) -->
			<div class="md:hidden">
				<!-- Games Tab Content -->
				<div v-show="activeTab === 'games'" class="py-4">
					<!-- Mobile Admin Controls -->
					<div v-if="isAdmin" class="mb-4 space-y-3">
						<div class="flex items-center justify-between">
							<div>
								<h3 class="text-lg font-semibold">Daily Games</h3>
								<p class="text-xs text-gray-400">
									Auto at {{ settings.notification_time }}
								</p>
							</div>
						</div>
						<div class="grid grid-cols-2 gap-2">
							<UButton
								block
								size="md"
								icon="i-heroicons-sparkles"
								:loading="gameSchedulerLoading"
								@click="handleStartGameNow"
							>
								Start Now
							</UButton>
							<UButton
								block
								size="md"
								variant="outline"
								icon="i-heroicons-pencil"
								@click="handleOpenCustomGame"
							>
								Custom
							</UButton>
						</div>
						<GamesManagePromptsModal :group-id="groupId" button-block />
					</div>

					<!-- Active Game -->
					<div v-if="activeGame">
						<GamesWouldYouRatherGame
							v-if="activeGame.game_type === 'would_you_rather'"
							:group-id="groupId"
						/>
						<GamesHotTakesGame
							v-else-if="activeGame.game_type === 'hot_takes'"
							:group-id="groupId"
						/>
						<GamesGuessWhoSaidItGame
							v-else-if="activeGame.game_type === 'guess_who_said_it'"
							:group-id="groupId"
						/>
						<GamesMostLikelyToGame
							v-else-if="activeGame.game_type === 'most_likely_to'"
							:group-id="groupId"
						/>
						<GamesTwoTruthsRouletteGame
							v-else-if="activeGame.game_type === 'two_truths_roulette'"
							:group-id="groupId"
						/>
						<GamesPredictYourFriendsGame
							v-else-if="activeGame.game_type === 'predict_your_friends'"
							:group-id="groupId"
						/>
						<GamesDinnerPartyDilemmasGame
							v-else-if="activeGame.game_type === 'dinner_party_dilemmas'"
							:group-id="groupId"
						/>
						<GamesComplimentEconomyGame
							v-else-if="activeGame.game_type === 'compliment_economy'"
							:group-id="groupId"
						/>
						<GamesBracketBattleGame
							v-else-if="activeGame.game_type === 'bracket_battle'"
							:group-id="groupId"
						/>
						<div v-else class="text-center py-12">
							<UIcon
								name="i-heroicons-puzzle-piece"
								class="w-16 h-16 mx-auto text-gray-400"
							/>
							<h3 class="text-xl font-semibold mt-4">
								{{ activeGame.game_type }}
							</h3>
							<p class="text-gray-600 mt-2">
								This game type is not yet implemented
							</p>
						</div>
					</div>

					<!-- No Active Game -->
					<div v-else class="text-center py-12">
						<UIcon
							name="i-heroicons-puzzle-piece"
							class="w-16 h-16 mx-auto text-gray-400"
						/>
						<h3 class="text-xl font-semibold mt-4">
							No active game
						</h3>
						<p class="text-gray-600 mt-2">
							The next game will be created at
							{{ settings.notification_time }}
						</p>
						<p v-if="isAdmin" class="text-sm text-gray-500 mt-1">
							Or click "Start Now" above to start one manually
						</p>
					</div>
				</div>

				<!-- Chat Tab Content -->
				<div v-show="activeTab === 'chat'" class="py-4">
					<!-- Loading State -->
					<div v-if="!chatThreadId" class="text-center py-12">
						<UIcon
							name="i-heroicons-arrow-path"
							class="w-8 h-8 animate-spin mx-auto"
						/>
						<p class="mt-4 text-gray-600">Loading chat...</p>
					</div>

					<!-- Chat Component -->
					<UiChatSection v-else :thread-id="chatThreadId" />
				</div>

				<!-- Members Tab Content -->
				<div v-show="activeTab === 'members'" class="py-4">
					<div class="flex justify-between items-center mb-6">
						<h3 class="text-lg font-semibold">
							Members ({{ memberCount }})
						</h3>
					</div>

					<div class="space-y-3">
						<UCard
							v-for="member in members"
							:key="member.user_id"
							class="p-4"
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<UAvatar
										:src="member.avatar_url"
										:alt="member.username || 'User'"
										size="md"
									/>
									<div>
										<p class="font-medium">
											{{
												member.username ||
												"Unknown User"
											}}
											<span
												v-if="member.user_id === user?.id"
												class="text-xs text-gray-500"
											>
												(You)
											</span>
										</p>
										<p class="text-sm text-gray-600">
											{{
												member.role === "admin"
													? "Admin"
													: "Member"
											}}
										</p>
									</div>
								</div>

								<!-- Admin actions dropdown (admin only, not for self) -->
								<UDropdown
									v-if="isAdmin && member.user_id !== user?.id"
									:items="getMemberActions(member)"
								>
									<UButton
										variant="ghost"
										icon="i-heroicons-ellipsis-vertical"
										size="sm"
									/>
								</UDropdown>
							</div>
						</UCard>
					</div>
				</div>

				<!-- Invite Tab Content -->
				<div v-show="activeTab === 'invite'" class="py-4">
					<div class="flex justify-between items-center mb-6">
						<h3 class="text-lg font-semibold">Invite Links</h3>
						<UButton
							v-if="isAdmin"
							size="sm"
							icon="i-heroicons-plus"
							@click="handleCreateInvite"
						>
							Create
						</UButton>
					</div>

					<!-- Invite codes list -->
					<div v-if="activeInviteCodes.length > 0" class="space-y-3">
						<UCard
							v-for="code in activeInviteCodes"
							:key="code.id"
							class="p-4"
						>
							<div class="flex flex-col gap-3">
								<div class="flex items-start justify-between">
									<div class="flex-1 min-w-0">
										<p class="font-mono text-sm break-all">
											{{ getInviteLink(code.code) }}
										</p>
										<p class="text-xs text-gray-500 mt-1">
											Created
											{{
												new Date(
													code.created_at
												).toLocaleDateString()
											}}
										</p>
									</div>
								</div>

								<div class="flex gap-2">
									<UButton
										size="sm"
										block
										@click="copyInviteLink(code.code)"
									>
										Copy Link
									</UButton>
									<UButton
										v-if="isAdmin"
										size="sm"
										variant="outline"
										color="error"
										@click="handleDeactivateCode(code.id)"
									>
										Deactivate
									</UButton>
								</div>
							</div>
						</UCard>
					</div>

					<!-- Empty State -->
					<UiEmptyState
						v-else
						icon="i-heroicons-link"
						title="No active invite links"
						:description="isAdmin ? 'Create an invite link to share with friends' : 'Ask an admin to create an invite link'"
					>
						<template v-if="isAdmin" #action>
							<UButton
								icon="i-heroicons-plus"
								@click="handleCreateInvite"
							>
								Create Invite Link
							</UButton>
						</template>
					</UiEmptyState>
				</div>
			</div>

			<!-- Custom Game Modal -->
			<UModal
				v-model:open="showCustomGameModal"
				title="Create Custom Game"
				:ui="{ content: 'max-w-5xl' }"
			>
				<template #body>
					<GamesCreateGameForm
						:group-id="groupId"
						@created="handleGameCreated"
						@cancel="handleGameCanceled"
					/>
				</template>
			</UModal>

			<!-- End Game Confirmation Modal -->
			<UModal
				v-model:open="showEndGameModal"
				title="End Current Game?"
			>
				<template #body>
					<div class="py-4">
						<p class="text-gray-700 dark:text-gray-300 mb-2">
							There is currently an active game in progress.
						</p>
						<p class="text-gray-600 dark:text-gray-400">
							Would you like to end it and start a new one? This action cannot be undone.
						</p>
					</div>
				</template>
				<template #footer>
					<div class="flex justify-end gap-3">
						<UButton
							variant="ghost"
							color="neutral"
							@click="handleEndGameCancel"
						>
							Cancel
						</UButton>
						<UButton
							color="error"
							@click="handleEndGameConfirm"
						>
							Yes, End Game
						</UButton>
					</div>
				</template>
			</UModal>

			<!-- Mobile Menu Modal (appears as bottom sheet on mobile) -->
			<UModal v-model="showMobileMenu" :ui="{ width: 'max-w-md' }">
				<div class="p-6 space-y-4">
					<h3 class="text-lg font-semibold">Group Menu</h3>
					<div class="space-y-2">
						<UButton
							v-if="isAdmin"
							block
							variant="outline"
							icon="i-heroicons-cog-6-tooth"
							:to="`/games/${groupId}/settings`"
							@click="showMobileMenu = false"
						>
							Group Settings
						</UButton>
						<UButton
							v-if="!isAdmin"
							block
							variant="outline"
							color="error"
							icon="i-heroicons-arrow-right-on-rectangle"
							@click="handleLeave(); showMobileMenu = false"
						>
							Leave Group
						</UButton>
					</div>
				</div>
			</UModal>
		</div>

		<!-- Bottom Navigation (Mobile Only) -->
		<BottomNav v-model="activeTab" :tabs="tabs" />
	</div>
</template>

<script setup lang="ts">
import type { Database } from "~/types/supabase";
import type { DropdownMenuItem } from "@nuxt/ui";

type Group = Database["public"]["Tables"]["groups"]["Row"];

definePageMeta({
	middleware: "auth",
	layout: "default",
});

const route = useRoute();
const router = useRouter();
const user = useSupabaseUser();
const groupId = computed(() => route.params.groupId as string);

// Mobile menu state
const showMobileMenu = ref(false);

// Control active tab via query params
const activeTab = computed({
	get() {
		return (route.query.tab as string) || 'games';
	},
	set(tab) {
		router.push({
			path: route.path,
			query: { tab },
		});
	},
});

const { fetchGroup, loading: groupLoading, error: groupError } = useGroups();
const {
	members,
	memberCount,
	adminCount,
	isAdmin,
	loading: membersLoading,
	error: membersError,
	leaveGroup,
	removeMember,
	updateRole,
} = useGroupMembers(groupId);
const {
	activeInviteCodes,
	createInviteCode,
	deactivateCode,
	getInviteLink,
	copyInviteLink,
	loading: inviteLoading,
} = useInviteCodes(groupId);

const {
	createGameForGroup,
	loading: gameSchedulerLoading,
	error: gameSchedulerError,
} = useGameScheduler();

const group = ref<Group | null>(null);
const loading = computed(() => groupLoading.value || membersLoading.value);
const error = computed(() => groupError.value || membersError.value);

// Game state
const activeGame = ref<any>(null);
const loadingGame = ref(false);
const showCustomGameModal = ref(false);
const showEndGameModal = ref(false);
const endGameResolve = ref<((value: boolean) => void) | null>(null);

// Chat state
const supabase = useSupabaseClient<Database>();
const chatThreadId = ref<string | null>(null);

const settings = computed(() => {
	if (!group.value?.settings) return { notification_time: "09:00" };
	return group.value.settings;
});

const tabs = [
	{
		slot: "games",
		value: "games",
		label: "Games",
		icon: "i-heroicons-puzzle-piece",
	},
	{
		slot: "chat",
		value: "chat",
		label: "Chat",
		icon: "i-heroicons-chat-bubble-left-right",
	},
	{
		slot: "members",
		value: "members",
		label: "Members",
		icon: "i-heroicons-users",
	},
	{
		slot: "invite",
		value: "invite",
		label: "Invite",
		icon: "i-heroicons-link",
	},
];

// Get or create chat thread for the group
const initChatThread = async () => {
	if (!groupId.value) return;

	try {
		const { data, error: rpcError } = await supabase.rpc(
			"create_group_chat_thread",
			{ p_group_id: groupId.value }
		);

		if (rpcError) throw rpcError;
		chatThreadId.value = data as string;
	} catch (err) {
		console.error("Error initializing chat:", err);
	}
};

const handleLeave = async () => {
	// Prevent last admin from leaving
	if (isAdmin.value && adminCount.value <= 1) {
		alert("You are the only admin. Please promote another member to admin before leaving, or delete the group from settings.");
		return;
	}

	if (confirm("Are you sure you want to leave this group?")) {
		const success = await leaveGroup();
		if (success) {
			navigateTo("/games");
		}
	}
};

const handleCreateInvite = async () => {
	const code = await createInviteCode();
	if (code) {
		// Success! Code will appear in the list
		console.log("Created invite code:", code);
	}
};

const handleCopyLink = async (code: string) => {
	const success = await copyInviteLink(code);
	if (success) {
		// TODO: Show toast notification
		alert("Invite link copied to clipboard!");
	}
};

const handleDeactivate = async (code: string) => {
	if (confirm("Are you sure you want to deactivate this invite link?")) {
		await deactivateCode(code);
	}
};

/**
 * Member Management Actions
 */
const getMemberActions = (member: any): DropdownMenuItem[] => {
	const actions: DropdownMenuItem[] = [];

	// Role management actions
	if (member.role === "admin") {
		// Can only demote if there are other admins
		if (adminCount.value > 1) {
			actions.push({
				label: "Remove Admin",
				icon: "i-heroicons-shield-exclamation",
				onSelect: () => handleDemote(member),
			});
		}
	} else {
		actions.push({
			label: "Make Admin",
			icon: "i-heroicons-shield-check",
			onSelect: () => handlePromote(member),
		});
	}

	// Remove member action (always available)
	actions.push({
		label: "Remove from Group",
		icon: "i-heroicons-user-minus",
		onSelect: () => handleRemoveMember(member),
	});

	return actions;
};

const handlePromote = async (member: any) => {
	if (confirm(`Promote ${member.username || "this user"} to admin?`)) {
		await updateRole(member.user_id, "admin");
	}
};

const handleDemote = async (member: any) => {
	if (adminCount.value <= 1) {
		alert("Cannot demote the last admin. Promote another member to admin first.");
		return;
	}

	if (confirm(`Remove admin privileges from ${member.username || "this user"}?`)) {
		await updateRole(member.user_id, "member");
	}
};

const handleRemoveMember = async (member: any) => {
	// Prevent removing the last admin
	if (member.role === "admin" && adminCount.value <= 1) {
		alert("Cannot remove the last admin. Promote another member to admin first.");
		return;
	}

	if (confirm(`Remove ${member.username || "this user"} from the group?`)) {
		await removeMember(member.user_id);
	}
};

// Fetch group data and init chat
// Load active game
const loadActiveGame = async () => {
	if (!groupId.value) return;

	loadingGame.value = true;
	try {
		const { data, error: fetchError } = await supabase
			.from("game_instances")
			.select("*")
			.eq("group_id", groupId.value)
			.eq("status", "active")
			.order("created_at", { ascending: false })
			.limit(1)
			.single();

		if (fetchError && fetchError.code !== "PGRST116") {
			throw fetchError;
		}

		activeGame.value = data;
	} catch (err) {
		console.error("Error loading active game:", err);
	} finally {
		loadingGame.value = false;
	}
};

// End the current active game
const endActiveGame = async () => {
	if (!activeGame.value) return true;

	try {
		const { error: updateError } = await supabase
			.from('game_instances')
			.update({ status: 'completed' })
			.eq('id', activeGame.value.id);

		if (updateError) throw updateError;

		activeGame.value = null;
		return true;
	} catch (err) {
		console.error('Error ending game:', err);
		alert('Failed to end the current game');
		return false;
	}
};

// Check if there's an active game and prompt user
const confirmEndCurrentGame = async (): Promise<boolean> => {
	if (!activeGame.value) return true;

	// Show modal and wait for user response
	return new Promise((resolve) => {
		endGameResolve.value = resolve;
		showEndGameModal.value = true;
	});
};

// Handle user confirming to end the game
const handleEndGameConfirm = async () => {
	showEndGameModal.value = false;
	const success = await endActiveGame();
	if (endGameResolve.value) {
		endGameResolve.value(success);
		endGameResolve.value = null;
	}
};

// Handle user canceling the end game action
const handleEndGameCancel = () => {
	showEndGameModal.value = false;
	if (endGameResolve.value) {
		endGameResolve.value(false);
		endGameResolve.value = null;
	}
};

// Handle automatic game creation ("Start Game Now")
const handleStartGameNow = async () => {
	if (!groupId.value) return;

	// Check and end current game if user confirms
	const canProceed = await confirmEndCurrentGame();
	if (!canProceed) return;

	const result = await createGameForGroup(groupId.value);

	if (result.success) {
		await loadActiveGame();
	} else {
		alert(`Failed to create game: ${result.error}`);
	}
};

// Handle opening custom game modal
const handleOpenCustomGame = async () => {
	// Check and end current game if user confirms
	const canProceed = await confirmEndCurrentGame();
	if (!canProceed) return;

	showCustomGameModal.value = true;
};

// Handle game created from custom form
const handleGameCreated = async (gameId: string, gameType: string) => {
	showCustomGameModal.value = false;
	await loadActiveGame();
};

// Handle cancel from custom form
const handleGameCanceled = () => {
	showCustomGameModal.value = false;
};

onMounted(async () => {
	group.value = await fetchGroup(groupId.value);
	await initChatThread();
	await loadActiveGame();
});
</script>
