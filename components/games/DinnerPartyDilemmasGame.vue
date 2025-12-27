<script setup lang="ts">
import type { DinnerPartyDilemmasPrompt } from '~/composables/games/useDinnerPartyDilemmas';
import { getGameMetadata } from '~/types/games';

const props = defineProps<{
	groupId: string;
}>();

const {
	loading,
	error,
	currentGame,
	userResponse,
	getActiveGame,
	getUserResponse,
	submitPartyLineup,
	submitVote,
	startVotingPhase,
	getResults,
	completeGame,
} = useDinnerPartyDilemmas(props.groupId);

const { isAdmin } = useGroupMembers(computed(() => props.groupId));
const supabase = useSupabaseClient();

const gameMetadata = getGameMetadata('dinner_party_dilemmas');

// Form state
const selectedGuests = ref<Set<string>>(new Set());
const reasoning = ref('');
const selectedVote = ref<string | null>(null);

const results = ref<any>(null);
const responseCount = ref(0);

// Load active game
const loadActiveGame = async () => {
	const game = await getActiveGame();
	if (game) {
		await getUserResponse(game.id);

		// Load results for voting phase or completed game
		if (game.current_phase === 'voting' || game.status === 'completed') {
			const gameResults = await getResults(game.id);
			if (gameResults) {
				responseCount.value = gameResults.responses.length;
				results.value = gameResults;

				// Initialize vote from saved data
				if (userResponse.value?.response_data?.votedUserId) {
					selectedVote.value = userResponse.value.response_data.votedUserId;
				}
			}
		} else {
			// Just count responses
			const { data: responses } = await supabase
				.from('game_responses')
				.select('id')
				.eq('game_instance_id', game.id);
			responseCount.value = responses?.length || 0;
		}
	}
};

// Toggle guest selection
const toggleGuestSelection = (guestId: string) => {
	if (selectedGuests.value.has(guestId)) {
		selectedGuests.value.delete(guestId);
	} else {
		// Max 3 guests
		if (selectedGuests.value.size < 3) {
			selectedGuests.value.add(guestId);
		}
	}
};

// Submit party lineup
const handleSubmitLineup = async () => {
	if (!currentGame.value || selectedGuests.value.size !== 3 || !reasoning.value.trim()) return;

	const result = await submitPartyLineup(currentGame.value.id, {
		selectedGuestIds: Array.from(selectedGuests.value),
		reasoning: reasoning.value,
	});

	if (result.success) {
		await loadActiveGame();
	}
};

// Submit vote
const handleSubmitVote = async () => {
	if (!currentGame.value || !selectedVote.value) return;

	const result = await submitVote(currentGame.value.id, selectedVote.value);

	if (result.success) {
		await loadActiveGame();
	}
};

// Start voting phase (admin)
const handleStartVotingPhase = async () => {
	if (!currentGame.value) return;

	const result = await startVotingPhase(currentGame.value.id);
	if (result.success) {
		await loadActiveGame();
	}
};

// Complete game (admin)
const handleCompleteGame = async () => {
	if (!currentGame.value) return;

	const result = await completeGame(currentGame.value.id);
	if (result.success) {
		await loadActiveGame();
	}
};

// Realtime subscription channel
const realtimeChannel = ref<ReturnType<typeof supabase.channel> | null>(null);

onMounted(async () => {
	await loadActiveGame();

	// Subscribe to game changes
	if (currentGame.value) {
		realtimeChannel.value = supabase
			.channel(`game-${currentGame.value.id}`)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'game_instances',
					filter: `id=eq.${currentGame.value.id}`,
				},
				async (payload) => {
					if (payload.new.status !== currentGame.value?.status ||
					    payload.new.current_phase !== currentGame.value?.current_phase) {
						await loadActiveGame();
					}
				}
			)
			.subscribe();
	}
});

onUnmounted(() => {
	if (realtimeChannel.value) {
		supabase.removeChannel(realtimeChannel.value);
	}
});

const showResults = computed(() => !!results.value && currentGame.value?.status === 'completed');

// Get guest options
const guestOptions = computed(() => {
	if (!currentGame.value) return [];
	const prompt = currentGame.value.prompt as DinnerPartyDilemmasPrompt;
	return prompt.options || [];
});

// Filter submissions to exclude user's own in voting phase
const otherSubmissions = computed(() => {
	if (!results.value) return [];
	const user = useSupabaseUser();
	return results.value.submissions.filter((s: any) => s.userId !== user.value?.id);
});
</script>

<template>
	<GamesGameLayout
		:game-metadata="gameMetadata"
		:loading="loading"
		:current-game="currentGame"
		:user-response="userResponse"
		:is-admin="isAdmin"
		:response-count="responseCount"
		:show-results="showResults"
		:error="error"
		@complete-game="handleCompleteGame"
	>
		<!-- Game Content Slot -->
		<template #game-content>
			<!-- Phase Indicator -->
			<div v-if="currentGame.current_phase" class="text-center mb-4">
				<UBadge
					:color="currentGame.current_phase === 'submission' ? 'blue' : 'purple'"
					size="lg"
				>
					{{
						currentGame.current_phase === 'submission'
							? '📝 Phase 1: Create Your Party'
							: '🗳️ Phase 2: Vote for Best Party'
					}}
				</UBadge>
			</div>

			<!-- Game Prompt -->
			<UCard class="overflow-hidden relative">
				<div class="text-center py-6 relative z-10">
					<div class="text-6xl mb-4">🍽️</div>

					<h3 class="text-xl font-semibold mb-2">
						Dinner Party Dilemmas
						<span v-if="(currentGame.prompt as DinnerPartyDilemmasPrompt)?.theme">
							: {{ (currentGame.prompt as DinnerPartyDilemmasPrompt).theme }}
						</span>
					</h3>
					<p class="text-sm text-gray-400">
						Choose 3 guests from the list below. Who would make the most interesting dinner party?
					</p>
				</div>
			</UCard>

			<!-- Phase 1: Submit Party Lineup -->
			<div v-if="currentGame.current_phase === 'submission'" class="space-y-4">
				<div v-if="!userResponse && currentGame.status === 'active'">
					<!-- Guest Selection -->
					<div>
						<div class="flex justify-between items-center mb-3">
							<h4 class="font-semibold">Select 3 Guests</h4>
							<UBadge>{{ selectedGuests.size }}/3 selected</UBadge>
						</div>

						<div class="grid grid-cols-2 gap-3">
							<div
								v-for="guest in guestOptions"
								:key="guest.id"
								:class="[
									'p-4 rounded-lg border-2 cursor-pointer transition-all',
									selectedGuests.has(guest.id)
										? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
										: 'border-gray-300 dark:border-gray-600 hover:border-pink-300'
								]"
								@click="toggleGuestSelection(guest.id)"
							>
								<div class="flex items-start gap-3">
									<div v-if="selectedGuests.has(guest.id)" class="text-pink-500 text-xl flex-shrink-0">
										✓
									</div>
									<div class="flex-1 min-w-0">
										<p class="font-semibold truncate">{{ guest.name }}</p>
										<p v-if="guest.description" class="text-xs text-gray-400 mt-1 line-clamp-2">
											{{ guest.description }}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Reasoning -->
					<UFormField label="Why this combination?" required>
						<UTextarea
							v-model="reasoning"
							placeholder="Explain why these three would make an interesting dinner party..."
							:rows="4"
						/>
					</UFormField>

					<UButton
						@click="handleSubmitLineup"
						:loading="loading"
						:disabled="selectedGuests.size !== 3 || !reasoning.trim()"
						block
						size="lg"
					>
						Submit Party Lineup
					</UButton>
				</div>

				<!-- Lineup submitted -->
				<div v-if="userResponse">
					<UCard class="bg-blue-50 dark:bg-blue-900/20">
						<div class="text-center py-6">
							<div class="text-3xl mb-3">✅</div>
							<p class="font-semibold mb-2">Party Lineup Submitted!</p>
							<p class="text-sm text-gray-400">
								Waiting for everyone to create their parties...
							</p>
						</div>
					</UCard>
				</div>
			</div>

			<!-- Phase 2: Vote -->
			<div v-if="currentGame.current_phase === 'voting'" class="space-y-4">
				<div v-if="!userResponse?.response_data?.votedUserId && currentGame.status === 'active' && otherSubmissions.length > 0">
					<p class="text-sm text-gray-400 text-center mb-4">
						Vote for the party you'd most want to attend:
					</p>

					<div class="space-y-4">
						<div
							v-for="submission in otherSubmissions"
							:key="submission.userId"
							:class="[
								'p-4 rounded-lg border-2 cursor-pointer transition-all',
								selectedVote === submission.userId
									? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
									: 'border-gray-300 dark:border-gray-600 hover:border-purple-300'
							]"
							@click="selectedVote = submission.userId"
						>
							<div class="flex items-start gap-3 mb-3">
								<UAvatar
									:src="submission.avatarUrl"
									:alt="submission.username"
									size="md"
								/>
								<div class="flex-1">
									<p class="font-semibold">{{ submission.username }}'s Party</p>
									<div class="flex flex-wrap gap-2 mt-2">
										<UBadge
											v-for="guest in submission.selectedGuests"
											:key="guest.id"
											color="pink"
											size="sm"
										>
											{{ guest.name }}
										</UBadge>
									</div>
								</div>
								<div v-if="selectedVote === submission.userId" class="text-purple-500 text-xl">
									✓
								</div>
							</div>

							<p class="text-sm text-gray-600 dark:text-gray-400 italic pl-1">
								"{{ submission.reasoning }}"
							</p>
						</div>
					</div>

					<UButton
						@click="handleSubmitVote"
						:loading="loading"
						:disabled="!selectedVote"
						block
						size="lg"
						class="mt-4"
					>
						Submit Vote
					</UButton>
				</div>

				<!-- Vote submitted -->
				<div v-if="userResponse?.response_data?.votedUserId">
					<UCard class="bg-blue-50 dark:bg-blue-900/20">
						<div class="text-center py-6">
							<div class="text-3xl mb-3">✅</div>
							<p class="font-semibold mb-2">Vote Submitted!</p>
							<p class="text-sm text-gray-400">
								Waiting for the game to end...
							</p>
						</div>
					</UCard>
				</div>
			</div>
		</template>

		<!-- Admin Controls -->
		<template #admin-controls>
			<UButton
				v-if="currentGame.current_phase === 'submission'"
				variant="outline"
				size="sm"
				icon="i-heroicons-arrow-right"
				:loading="loading"
				@click="handleStartVotingPhase"
			>
				Start Voting Phase
			</UButton>
			<UButton
				variant="outline"
				size="sm"
				icon="i-heroicons-check-circle"
				:loading="loading"
				@click="handleCompleteGame"
			>
				End Game & Publish Results
			</UButton>
		</template>

		<!-- Results Slot -->
		<template #results>
			<!-- Winner -->
			<UCard v-if="results.winner" class="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-800/20">
				<div class="text-center py-6">
					<div class="text-4xl mb-3">🏆</div>
					<p class="text-lg font-semibold mb-1">Most Interesting Party</p>
					<p class="text-2xl font-bold text-pink-600 mb-2">
						{{ results.winner.username }}
					</p>
					<UBadge color="pink">{{ results.winner.voteCount }} {{ results.winner.voteCount === 1 ? 'vote' : 'votes' }}</UBadge>
				</div>
			</UCard>

			<!-- All Submissions -->
			<div v-if="results.submissions && results.submissions.length > 0">
				<h4 class="font-semibold mb-4">All Party Lineups</h4>
				<div class="space-y-4">
					<div
						v-for="submission in results.submissions"
						:key="submission.userId"
						class="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4"
					>
						<div class="flex items-start justify-between mb-3">
							<div class="flex items-center gap-3">
								<UAvatar
									:src="submission.avatarUrl"
									:alt="submission.username"
									size="md"
								/>
								<div>
									<p class="font-semibold">{{ submission.username }}</p>
									<div class="text-sm text-gray-400">
										{{ submission.voteCount }} {{ submission.voteCount === 1 ? 'vote' : 'votes' }}
									</div>
								</div>
							</div>
						</div>

						<!-- Guests -->
						<div class="mb-3">
							<p class="text-xs font-semibold text-gray-400 mb-2">GUESTS:</p>
							<div class="flex flex-wrap gap-2">
								<UBadge
									v-for="guest in submission.selectedGuests"
									:key="guest.id"
									color="pink"
								>
									{{ guest.name }}
								</UBadge>
							</div>
						</div>

						<!-- Reasoning -->
						<div class="bg-gray-50 dark:bg-gray-800 rounded p-3">
							<p class="text-sm italic text-gray-600 dark:text-gray-400">
								"{{ submission.reasoning }}"
							</p>
						</div>
					</div>
				</div>
			</div>
		</template>
	</GamesGameLayout>
</template>
