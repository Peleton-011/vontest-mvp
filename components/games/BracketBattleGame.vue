<script setup lang="ts">
import type { BracketBattlePrompt } from '~/composables/games/useBracketBattle';
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
	submitEntry,
	startVotingPhase,
	getResults,
	completeGame,
} = useBracketBattle(props.groupId);

const { isAdmin } = useGroupMembers(computed(() => props.groupId));
const supabase = useSupabaseClient();

const gameMetadata = getGameMetadata('bracket_battle');

// Form state
const entryName = ref('');
const entryDescription = ref('');

const results = ref<any>(null);
const responseCount = ref(0);

// Load active game
const loadActiveGame = async () => {
	const game = await getActiveGame();
	if (game) {
		await getUserResponse(game.id);

		// Load results if voting or completed
		if (game.current_phase?.startsWith('voting') || game.status === 'completed') {
			const gameResults = await getResults(game.id);
			if (gameResults) {
				responseCount.value = gameResults.responses.length;
				results.value = gameResults;
			}
		} else {
			// Just count responses
			const { data: responses } = await supabase
				.from('game_responses')
				.select('id')
				.eq('game_id', game.id);
			responseCount.value = responses?.length || 0;
		}
	}
};

// Submit entry
const handleSubmitEntry = async () => {
	if (!currentGame.value || !entryName.value.trim()) return;

	const result = await submitEntry(
		currentGame.value.id,
		entryName.value,
		entryDescription.value || undefined
	);

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

onMounted(async () => {
	await loadActiveGame();

	// Subscribe to game changes
	if (currentGame.value) {
		const channel = supabase
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

		onUnmounted(() => {
			supabase.removeChannel(channel);
		});
	}
});

const showResults = computed(() => !!results.value && currentGame.value?.status === 'completed');

// Get tournament topic
const tournamentTopic = computed(() => {
	if (!currentGame.value) return '';
	const prompt = currentGame.value.prompt as BracketBattlePrompt;
	return prompt.topic || 'Tournament';
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
					:color="currentGame.current_phase === 'submission' ? 'blue' : 'orange'"
					size="lg"
				>
					{{
						currentGame.current_phase === 'submission'
							? '📝 Phase 1: Nominate Entries'
							: '🏆 Tournament Voting'
					}}
				</UBadge>
			</div>

			<!-- Game Prompt -->
			<UCard class="overflow-hidden relative">
				<div class="text-center py-6 relative z-10">
					<div class="text-6xl mb-4">🏆</div>

					<h3 class="text-xl font-semibold mb-2">
						{{ tournamentTopic }}
					</h3>
					<p class="text-sm text-gray-400">
						Tournament-style voting to crown the champion!
					</p>
				</div>
			</UCard>

			<!-- Phase 1: Submit Entry -->
			<div v-if="currentGame.current_phase === 'submission'" class="space-y-4">
				<div v-if="!userResponse && currentGame.status === 'active'">
					<UFormField label="Your Nominee" required>
						<UInput
							v-model="entryName"
							placeholder="Enter your tournament entry..."
							size="lg"
						/>
					</UFormField>

					<UFormField label="Why should it win?" hint="Optional">
						<UTextarea
							v-model="entryDescription"
							placeholder="Explain why this entry deserves to win..."
							:rows="3"
						/>
					</UFormField>

					<UButton
						@click="handleSubmitEntry"
						:loading="loading"
						:disabled="!entryName.trim()"
						block
						size="lg"
					>
						Submit Entry
					</UButton>
				</div>

				<!-- Entry submitted -->
				<div v-if="userResponse">
					<UCard class="bg-blue-50 dark:bg-blue-900/20">
						<div class="text-center py-6">
							<div class="text-3xl mb-3">✅</div>
							<p class="font-semibold mb-2">Entry Submitted!</p>
							<p class="text-sm text-gray-400 mb-2">
								Your entry: <span class="font-semibold text-gray-600 dark:text-gray-300">"{{ userResponse.response_data.entry.name }}"</span>
							</p>
							<p class="text-sm text-gray-400">
								Waiting for tournament to begin...
							</p>
						</div>
					</UCard>
				</div>
			</div>

			<!-- Voting Phase (simplified - show all entries) -->
			<div v-if="currentGame.current_phase?.startsWith('voting')" class="space-y-4">
				<UCard class="bg-orange-50 dark:bg-orange-900/20">
					<div class="text-center py-4">
						<div class="text-3xl mb-2">🏆</div>
						<p class="font-semibold mb-2">Tournament in Progress!</p>
						<p class="text-sm text-gray-400">
							Voting rounds will be conducted by the admin.
						</p>
					</div>
				</UCard>

				<!-- Show all entries -->
				<div v-if="results && results.allEntries.length > 0">
					<h4 class="font-semibold mb-3">Tournament Entries</h4>
					<div class="grid grid-cols-2 gap-3">
						<div
							v-for="entry in results.allEntries"
							:key="entry.id"
							class="p-4 border-2 border-orange-300 dark:border-orange-700 rounded-lg"
						>
							<p class="font-semibold">{{ entry.name }}</p>
							<p v-if="entry.description" class="text-xs text-gray-400 mt-1">
								{{ entry.description }}
							</p>
							<p class="text-xs text-gray-500 mt-2">
								By {{ entry.nominatedBy }}
							</p>
						</div>
					</div>
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
				Start Tournament
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
			<!-- Champion -->
			<UCard v-if="results.champion" class="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-800/20">
				<div class="text-center py-6">
					<div class="text-4xl mb-3">🏆</div>
					<p class="text-lg font-semibold mb-1">Tournament Champion</p>
					<p class="text-2xl font-bold text-orange-600 mb-2">
						{{ results.champion.name }}
					</p>
					<p v-if="results.champion.description" class="text-sm text-gray-600 dark:text-gray-400 mt-2">
						{{ results.champion.description }}
					</p>
				</div>
			</UCard>

			<!-- All Entries -->
			<div v-if="results.allEntries && results.allEntries.length > 0">
				<h4 class="font-semibold mb-4">All Tournament Entries</h4>
				<div class="space-y-3">
					<div
						v-for="entry in results.allEntries"
						:key="entry.id"
						class="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4"
					>
						<p class="font-semibold text-lg">{{ entry.name }}</p>
						<p v-if="entry.description" class="text-sm text-gray-600 dark:text-gray-400 mt-1">
							{{ entry.description }}
						</p>
						<p class="text-xs text-gray-500 mt-2">
							Nominated by {{ entry.nominatedBy }}
						</p>
					</div>
				</div>
			</div>
		</template>
	</GamesGameLayout>
</template>
