<script setup lang="ts">
import type { TwoTruthsRoulettePrompt } from '~/composables/games/useTwoTruthsRoulette';
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
	submitStatements,
	submitVotes,
	startGuessingPhase,
	getResults,
	completeGame,
} = useTwoTruthsRoulette(props.groupId);

const { isAdmin } = useGroupMembers(computed(() => props.groupId));
const supabase = useSupabaseClient();
const user = useSupabaseUser();

const gameMetadata = getGameMetadata('two_truths_roulette');

// Form for submission phase
const submissionForm = reactive({
	statement1: '',
	statement2: '',
	statement3: '',
	lieIndex: null as 1 | 2 | 3 | null,
});

// Voting form for guessing phase
const votes = ref<Record<string, number>>({});

const results = ref<any>(null);
const responseCount = ref(0);

// Load active game
const loadActiveGame = async () => {
	const game = await getActiveGame();
	if (game) {
		await getUserResponse(game.id);

		// Load results if in guessing phase or completed
		if (game.current_phase === 'guessing' || game.status === 'completed') {
			const gameResults = await getResults(game.id);
			if (gameResults) {
				responseCount.value = gameResults.responses.length;
				results.value = gameResults;

				// Initialize votes if user hasn't voted yet
				if (game.current_phase === 'guessing' && !userResponse.value?.response_data?.votes) {
					votes.value = {};
				} else if (userResponse.value?.response_data?.votes) {
					votes.value = userResponse.value.response_data.votes as Record<string, number>;
				}
			}
		}
	}
};

// Submit statements (Phase 1)
const handleSubmitStatements = async () => {
	if (!currentGame.value || !submissionForm.statement1 || !submissionForm.statement2 || !submissionForm.statement3 || !submissionForm.lieIndex) {
		return;
	}

	const result = await submitStatements(currentGame.value.id, {
		statement1: submissionForm.statement1,
		statement2: submissionForm.statement2,
		statement3: submissionForm.statement3,
		lieIndex: submissionForm.lieIndex,
	});

	if (result.success) {
		await loadActiveGame();
	}
};

// Submit votes (Phase 2)
const handleSubmitVotes = async () => {
	if (!currentGame.value) return;

	const result = await submitVotes(currentGame.value.id, votes.value);

	if (result.success) {
		await loadActiveGame();
	}
};

// Start guessing phase (admin)
const handleStartGuessingPhase = async () => {
	if (!currentGame.value) return;

	const result = await startGuessingPhase(currentGame.value.id);
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
					if (payload.new.current_phase !== currentGame.value?.current_phase ||
					    payload.new.status !== currentGame.value?.status) {
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

const showResults = computed(() => !!results.value && (!!userResponse.value || currentGame.value?.status === 'completed'));

// Filter submissions to exclude user's own in voting phase
const otherSubmissions = computed(() => {
	if (!results.value || !user.value) return [];
	return results.value.submissions.filter((s: any) => s.userId !== user.value.id);
});

// Get user's own submission
const ownSubmission = computed(() => {
	if (!results.value || !user.value) return null;
	return results.value.submissions.find((s: any) => s.userId === user.value.id);
});

// Check if all votes are submitted
const allVotesSubmitted = computed(() => {
	if (!results.value) return false;
	return otherSubmissions.value.every((s: any) => votes.value[s.userId] !== undefined);
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
			<div class="text-center">
				<UBadge
					:color="currentGame.current_phase === 'submission' ? 'blue' : 'green'"
					size="lg"
				>
					Phase {{ currentGame.current_phase === 'submission' ? '1' : '2' }}:
					{{ currentGame.current_phase === 'submission' ? 'Submit Statements' : 'Guess the Lies' }}
				</UBadge>
			</div>

			<!-- Game Prompt -->
			<UCard class="overflow-hidden relative">
				<div class="text-center py-6 relative z-10">
					<!-- Emoji -->
					<div class="text-6xl mb-4">✨</div>

					<h3 class="text-xl font-semibold mb-2">
						Two Truths and a Lie
						<span v-if="(currentGame.prompt as TwoTruthsRoulettePrompt)?.timeframe">
							{{ (currentGame.prompt as TwoTruthsRoulettePrompt).timeframe }}
						</span>
					</h3>
					<p class="text-sm text-gray-400">
						Submit two truths and one lie. Can your friends spot which is which?
					</p>
				</div>
			</UCard>

			<!-- Phase 1: Submit Statements -->
			<div v-if="currentGame.current_phase === 'submission'" class="space-y-4">
				<div v-if="!userResponse && currentGame.status === 'active'">
					<div class="space-y-4">
						<!-- Statement 1 -->
						<UFormField label="Statement 1">
							<UInput
								v-model="submissionForm.statement1"
								placeholder="Enter your first statement..."
								size="lg"
							/>
						</UFormField>

						<!-- Statement 2 -->
						<UFormField label="Statement 2">
							<UInput
								v-model="submissionForm.statement2"
								placeholder="Enter your second statement..."
								size="lg"
							/>
						</UFormField>

						<!-- Statement 3 -->
						<UFormField label="Statement 3">
							<UInput
								v-model="submissionForm.statement3"
								placeholder="Enter your third statement..."
								size="lg"
							/>
						</UFormField>

						<!-- Select the lie -->
						<UFormField label="Which statement is the LIE?" required>
							<div class="grid grid-cols-3 gap-3">
								<UCard
									:class="[
										'cursor-pointer transition-all text-center p-4',
										submissionForm.lieIndex === 1 ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' : 'hover:scale-105'
									]"
									@click="submissionForm.lieIndex = 1"
								>
									<div class="text-2xl mb-1">1</div>
									<div class="text-xs">Statement 1</div>
								</UCard>

								<UCard
									:class="[
										'cursor-pointer transition-all text-center p-4',
										submissionForm.lieIndex === 2 ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' : 'hover:scale-105'
									]"
									@click="submissionForm.lieIndex = 2"
								>
									<div class="text-2xl mb-1">2</div>
									<div class="text-xs">Statement 2</div>
								</UCard>

								<UCard
									:class="[
										'cursor-pointer transition-all text-center p-4',
										submissionForm.lieIndex === 3 ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' : 'hover:scale-105'
									]"
									@click="submissionForm.lieIndex = 3"
								>
									<div class="text-2xl mb-1">3</div>
									<div class="text-xs">Statement 3</div>
								</UCard>
							</div>
						</UFormField>

						<UButton
							@click="handleSubmitStatements"
							:loading="loading"
							:disabled="!submissionForm.statement1 || !submissionForm.statement2 || !submissionForm.statement3 || !submissionForm.lieIndex"
							block
							size="lg"
						>
							Submit Statements
						</UButton>
					</div>
				</div>

				<!-- Submitted confirmation -->
				<div v-if="userResponse">
					<UCard class="bg-blue-50 dark:bg-blue-900/20">
						<div class="text-center py-6">
							<div class="text-3xl mb-3">✅</div>
							<p class="font-semibold mb-2">Statements Submitted!</p>
							<p class="text-sm text-gray-400">
								Waiting for everyone to submit...
							</p>
						</div>
					</UCard>
				</div>
			</div>

			<!-- Phase 2: Guess the Lies -->
			<div v-if="currentGame.current_phase === 'guessing'" class="space-y-6">
				<!-- Your Own Submission -->
				<div v-if="ownSubmission" class="pb-4 mb-4 border-b-2 border-dashed border-blue-300">
					<div class="flex items-start gap-3 mb-2">
						<UAvatar
							:src="ownSubmission.avatarUrl"
							:alt="ownSubmission.username"
							size="md"
						/>
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-3">
								<span class="font-semibold">{{ ownSubmission.username }}</span>
								<UBadge color="blue" size="xs">You</UBadge>
							</div>

							<div class="space-y-2">
								<div
									v-for="(statement, index) in ownSubmission.statements"
									:key="index"
									:class="[
										'p-3 rounded-lg text-sm',
										index + 1 === ownSubmission.lieIndex
											? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500'
											: 'bg-gray-50 dark:bg-gray-800'
									]"
								>
									<div class="flex items-start gap-2">
										<div class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-bold">
											{{ index + 1 }}
										</div>
										<p class="flex-1">{{ statement }}</p>
										<div v-if="index + 1 === ownSubmission.lieIndex" class="text-red-500 text-xs font-semibold">
											LIE
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Other Users' Submissions -->
				<div v-if="currentGame.status === 'active' && otherSubmissions.length > 0" class="space-y-6">
					<p class="text-sm text-gray-400 text-center">
						Vote on which statement is the lie for each person:
					</p>

					<div
						v-for="submission in otherSubmissions"
						:key="submission.userId"
						class="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4"
					>
						<div class="flex items-center gap-3 mb-4">
							<UAvatar
								:src="submission.avatarUrl"
								:alt="submission.username"
								size="md"
							/>
							<span class="font-semibold">{{ submission.username }}</span>
						</div>

						<div class="space-y-2">
							<div
								v-for="(statement, index) in submission.statements"
								:key="index"
								:class="[
									'p-3 rounded-lg cursor-pointer transition-all',
									votes[submission.userId] === index + 1
										? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20'
										: 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
								]"
								@click="votes[submission.userId] = index + 1"
							>
								<div class="flex items-start gap-2">
									<div class="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold">
										{{ index + 1 }}
									</div>
									<p class="flex-1 text-sm">{{ statement }}</p>
									<div v-if="votes[submission.userId] === index + 1" class="text-xs font-semibold text-red-500">
										This is the lie
									</div>
								</div>
							</div>
						</div>
					</div>

					<UButton
						@click="handleSubmitVotes"
						:loading="loading"
						:disabled="!allVotesSubmitted"
						block
						size="lg"
					>
						Submit Votes {{ allVotesSubmitted ? '' : `(${Object.keys(votes).length}/${otherSubmissions.length})` }}
					</UButton>
				</div>

				<!-- Votes submitted -->
				<div v-if="userResponse?.response_data?.votes && currentGame.status === 'active'">
					<UCard class="bg-blue-50 dark:bg-blue-900/20">
						<div class="text-center py-6">
							<div class="text-3xl mb-3">✅</div>
							<p class="font-semibold mb-2">Votes Submitted!</p>
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
				@click="handleStartGuessingPhase"
			>
				Start Guessing Phase
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
			<!-- Top Foolers -->
			<UCard v-if="results.topFoolers && results.topFoolers.length > 0" class="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-800/20">
				<div class="text-center py-4">
					<div class="text-3xl mb-3">🎭</div>
					<p class="text-lg font-semibold mb-3">Top Deceivers</p>
					<div class="space-y-2">
						<div
							v-for="(fooler, index) in results.topFoolers"
							:key="fooler.userId"
							class="flex items-center justify-center gap-3"
						>
							<span class="text-lg">{{ ['🥇', '🥈', '🥉'][index] }}</span>
							<span class="font-semibold">{{ fooler.username }}</span>
							<UBadge>{{ fooler.fooledCount }} fooled</UBadge>
						</div>
					</div>
				</div>
			</UCard>

			<!-- Top Detectives -->
			<UCard v-if="results.topDetectives && results.topDetectives.length > 0" class="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-800/20">
				<div class="text-center py-4">
					<div class="text-3xl mb-3">🕵️</div>
					<p class="text-lg font-semibold mb-3">Top Detectives</p>
					<div class="space-y-2">
						<div
							v-for="(detective, index) in results.topDetectives"
							:key="detective.userId"
							class="flex items-center justify-center gap-3"
						>
							<span class="text-lg">{{ ['🥇', '🥈', '🥉'][index] }}</span>
							<span class="font-semibold">{{ detective.username }}</span>
							<UBadge>{{ detective.correctGuesses }} correct</UBadge>
						</div>
					</div>
				</div>
			</UCard>

			<!-- All Submissions with Reveals -->
			<div v-if="results.submissions && results.submissions.length > 0">
				<h4 class="font-semibold mb-4">All Submissions</h4>
				<div class="space-y-4">
					<div
						v-for="submission in results.submissions"
						:key="submission.userId"
						class="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4"
					>
						<div class="flex items-center gap-3 mb-4">
							<UAvatar
								:src="submission.avatarUrl"
								:alt="submission.username"
								size="md"
							/>
							<div class="flex-1">
								<span class="font-semibold">{{ submission.username }}</span>
								<div class="text-xs text-gray-400 mt-1">
									Fooled {{ submission.fooledCount }} {{ submission.fooledCount === 1 ? 'person' : 'people' }}
								</div>
							</div>
						</div>

						<div class="space-y-2">
							<div
								v-for="(statement, index) in submission.statements"
								:key="index"
								:class="[
									'p-3 rounded-lg',
									index + 1 === submission.lieIndex
										? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500'
										: 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
								]"
							>
								<div class="flex items-start gap-2">
									<div class="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold">
										{{ index + 1 }}
									</div>
									<p class="flex-1 text-sm">{{ statement }}</p>
									<div :class="[
										'text-xs font-semibold',
										index + 1 === submission.lieIndex ? 'text-red-500' : 'text-green-500'
									]">
										{{ index + 1 === submission.lieIndex ? 'LIE' : 'TRUTH' }}
									</div>
								</div>
							</div>
						</div>

						<!-- Who voted what -->
						<div v-if="submission.votes.length > 0" class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
							<p class="text-xs font-semibold text-gray-400 mb-2">Votes:</p>
							<div class="flex flex-wrap gap-2">
								<UBadge
									v-for="vote in submission.votes"
									:key="vote.voterId"
									:color="vote.wasCorrect ? 'green' : 'red'"
									size="xs"
								>
									{{ vote.voterUsername }}: {{ vote.wasCorrect ? '✓' : '✗' }} (guessed #{{ vote.guessedLieIndex }})
								</UBadge>
							</div>
						</div>
					</div>
				</div>
			</div>
		</template>
	</GamesGameLayout>
</template>
