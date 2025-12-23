<script setup lang="ts">
import { GAME_TYPES, type GameType } from '~/types/games';
import type { GuessWhoSaidItPrompt } from '~/composables/games/useGuessWhoSaidIt';

const props = defineProps<{
	groupId: string;
}>();

const {
	loading,
	error,
	currentGame,
	userResponse,
	getActiveGame,
	submitAnswer,
	submitGuesses,
	startGuessingPhase,
	getResults,
	completeGame,
} = useGuessWhoSaidIt(props.groupId);

const supabase = useSupabaseClient();

// Form states
const answerForm = reactive({
	answer: '',
});

const guessForm = ref<Record<string, string>>({});

const results = ref<any>(null);
const responseCount = ref(0);
const groupMembers = ref<any[]>([]);

const gameMetadata = computed(() => GAME_TYPES['guess_who_said_it']);

// Load group members for guessing phase
const loadGroupMembers = async () => {
	const { data: members } = await supabase
		.from('group_members')
		.select('user_id, profiles:user_id (username)')
		.eq('group_id', props.groupId);

	groupMembers.value = members?.map((m: any) => ({
		userId: m.user_id,
		username: m.profiles?.username || 'Unknown',
	})) || [];
};

// Load active game and user response
const loadActiveGame = async () => {
	const game = await getActiveGame();
	if (game) {
		// Get results
		const gameResults = await getResults(game.id);
		if (gameResults) {
			responseCount.value = gameResults.responses.length;

			// Only show full results if game is completed
			if (game.status === 'completed') {
				results.value = gameResults;
			}
		}

		// Load group members for guessing phase
		if (game.current_phase === 'guessing') {
			await loadGroupMembers();

			// Initialize guess form with empty values for each response
			if (gameResults) {
				const initialGuesses: Record<string, string> = {};
				gameResults.responses.forEach((r: any) => {
					initialGuesses[r.responseId] = userResponse.value?.guesses?.[r.responseId] || '';
				});
				guessForm.value = initialGuesses;
			}
		}
	}
};

// Submit answer (phase 1)
const handleSubmitAnswer = async () => {
	if (!currentGame.value || !answerForm.answer.trim()) return;

	const result = await submitAnswer(currentGame.value.id, answerForm.answer);

	if (result.success) {
		await loadActiveGame();
	}
};

// Submit guesses (phase 2)
const handleSubmitGuesses = async () => {
	if (!currentGame.value) return;

	const result = await submitGuesses(currentGame.value.id, guessForm.value);

	if (result.success) {
		await loadActiveGame();
	}
};

// Start guessing phase (admin only)
const handleStartGuessingPhase = async () => {
	if (!currentGame.value) return;

	const result = await startGuessingPhase(currentGame.value.id);
	if (result.success) {
		await loadActiveGame();
	}
};

// Complete game (admin only)
const handleCompleteGame = async () => {
	if (!currentGame.value) return;

	const result = await completeGame(currentGame.value.id);
	if (result.success) {
		await loadActiveGame();
	}
};

onMounted(loadActiveGame);
</script>

<template>
	<div class="space-y-6">
		<!-- Game Header -->
		<div class="flex items-start justify-between gap-4">
			<div class="flex items-start gap-4 flex-1">
				<div class="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/20">
					<UIcon :name="gameMetadata.icon" class="w-8 h-8 text-purple-600" />
				</div>
				<div class="flex-1">
					<h2 class="text-2xl font-bold">{{ gameMetadata.name }}</h2>
					<p class="text-gray-600 dark:text-gray-400 mt-1">
						{{ gameMetadata.description }}
					</p>
				</div>
			</div>

			<!-- Info Popover -->
			<UPopover>
				<UButton
					variant="ghost"
					icon="i-heroicons-information-circle"
					size="sm"
				/>
				<template #content>
					<div class="text-left space-y-2 p-4">
						<p class="font-semibold">How to Play:</p>
						<ol class="text-sm space-y-1 list-decimal list-inside">
							<li v-for="(step, index) in gameMetadata.howToPlay" :key="index">
								{{ step }}
							</li>
						</ol>
					</div>
				</template>
			</UPopover>
		</div>

		<!-- Error Display -->
		<div v-if="error" class="text-red-600 bg-red-50 p-3 rounded">
			{{ error }}
		</div>

		<!-- No Active Game -->
		<div v-if="!currentGame" class="text-center py-12">
			<UIcon name="i-heroicons-question-mark-circle" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
			<p class="text-gray-600">Loading game...</p>
		</div>

		<!-- Active Game -->
		<div v-else class="space-y-6">
			<!-- Phase Indicator -->
			<div class="text-center">
				<UBadge
					:color="currentGame.current_phase === 'submission' ? 'blue' : 'green'"
					size="lg"
				>
					Phase {{ currentGame.current_phase === 'submission' ? '1' : '2' }}:
					{{ currentGame.current_phase === 'submission' ? 'Submit Answers' : 'Guess Who Said What' }}
				</UBadge>
			</div>

			<!-- Response Count Card -->
			<div v-if="currentGame.current_phase === 'submission' && currentGame.status === 'active'" class="text-center">
				<UCard class="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-800/20">
					<div class="py-6">
						<div class="text-4xl font-bold text-purple-600 mb-2">
							{{ responseCount }}
						</div>
						<div class="text-lg font-semibold mb-1">
							{{ responseCount === 1 ? 'Response' : 'Responses' }}
						</div>
						<div class="text-sm text-gray-600">
							Submit your answer to continue!
						</div>
					</div>
				</UCard>
			</div>

			<!-- Game Prompt -->
			<UCard>
				<div class="text-center py-6">
					<div class="text-3xl mb-2">❓</div>
					<p class="text-xl font-semibold">
						{{ (currentGame.prompt as GuessWhoSaidItPrompt).question }}
					</p>
				</div>
			</UCard>

			<!-- Phase 1: Submit Answer -->
			<div v-if="currentGame.current_phase === 'submission'" class="space-y-4">
				<div v-if="!userResponse && currentGame.status === 'active'">
					<UFormField label="Your Answer (anonymous)">
						<UTextarea
							v-model="answerForm.answer"
							placeholder="Enter your answer..."
							:rows="4"
						/>
					</UFormField>

					<UButton
						@click="handleSubmitAnswer"
						:loading="loading"
						:disabled="!answerForm.answer.trim()"
						block
						size="lg"
						class="mt-4"
					>
						Submit Answer
					</UButton>
				</div>

				<!-- User's Answer Confirmation -->
				<div v-if="userResponse" class="space-y-4">
					<UCard class="bg-blue-50 dark:bg-blue-900/20">
						<div class="text-center py-6">
							<div class="text-3xl mb-3">✅</div>
							<p class="font-semibold mb-2">Answer Submitted!</p>
							<p class="text-sm text-gray-600">
								Waiting for everyone to submit their answers...
							</p>
						</div>
					</UCard>
				</div>

				<!-- Admin: Start Guessing Phase -->
				<div v-if="currentGame.status === 'active'" class="pt-4 border-t">
					<UButton
						@click="handleStartGuessingPhase"
						variant="outline"
						size="sm"
					>
						Start Guessing Phase
					</UButton>
				</div>
			</div>

			<!-- Phase 2: Guess Who Said What -->
			<div v-if="currentGame.current_phase === 'guessing'" class="space-y-4">
				<!-- Get Results First -->
				<div v-if="results && currentGame.status === 'active'" class="space-y-4">
					<div class="text-center mb-4">
						<p class="text-sm text-gray-600">
							Match each answer to the person who said it!
						</p>
					</div>

					<!-- Guessing Form -->
					<div class="space-y-3">
						<UCard
							v-for="response in results.responses"
							:key="response.responseId"
							class="p-4"
						>
							<div class="space-y-3">
								<p class="text-sm font-semibold text-gray-700">
									"{{ response.answer }}"
								</p>
								<UFormField label="Who said this?">
									<USelect
										v-model="guessForm[response.responseId]"
										:options="groupMembers.map(m => ({ label: m.username, value: m.userId }))"
										placeholder="Select a person..."
									/>
								</UFormField>
							</div>
						</UCard>
					</div>

					<UButton
						@click="handleSubmitGuesses"
						:loading="loading"
						block
						size="lg"
					>
						Submit Guesses
					</UButton>
				</div>

				<!-- Guesses Submitted -->
				<div v-if="userResponse?.guesses && currentGame.status === 'active'" class="space-y-4">
					<UCard class="bg-blue-50 dark:bg-blue-900/20">
						<div class="text-center py-6">
							<div class="text-3xl mb-3">✅</div>
							<p class="font-semibold mb-2">Guesses Submitted!</p>
							<p class="text-sm text-gray-600">
								Waiting for the game to end to see results...
							</p>
						</div>
					</UCard>
				</div>

				<!-- Admin: Complete Game -->
				<div v-if="currentGame.status === 'active'" class="pt-4 border-t">
					<UButton
						@click="handleCompleteGame"
						variant="outline"
						size="sm"
					>
						End Game & Post Results
					</UButton>
				</div>
			</div>

			<!-- Results (Game Completed) -->
			<div v-if="results && currentGame.status === 'completed'" class="space-y-4">
				<!-- Top Guesser -->
				<UCard v-if="results.topGuesser" class="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-800/20">
					<div class="text-center py-6">
						<div class="text-4xl mb-3">🏆</div>
						<p class="text-lg font-semibold mb-1">Top Guesser</p>
						<p class="text-2xl font-bold text-yellow-600">{{ results.topGuesser.username }}</p>
						<p class="text-sm text-gray-600 mt-1">
							{{ results.topGuesser.correct }} correct guesses
						</p>
					</div>
				</UCard>

				<!-- All Guesses Performance -->
				<UCard>
					<h3 class="font-semibold mb-4">Guess Accuracy</h3>
					<div class="space-y-3">
						<div
							v-for="guesser in results.guesses"
							:key="guesser.guesserUserId"
							class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded"
						>
							<span class="font-semibold">{{ guesser.guesserUsername }}</span>
							<div class="flex items-center gap-3">
								<span class="text-sm text-gray-600">
									{{ guesser.correctGuesses }}/{{ guesser.totalGuesses }} correct
								</span>
								<UBadge :color="guesser.accuracy >= 70 ? 'green' : guesser.accuracy >= 40 ? 'yellow' : 'red'">
									{{ Math.round(guesser.accuracy) }}%
								</UBadge>
							</div>
						</div>
					</div>
				</UCard>

				<!-- Who Actually Said What -->
				<UCard>
					<h3 class="font-semibold mb-4">Who Actually Said What</h3>
					<div class="space-y-3">
						<div
							v-for="response in results.responses"
							:key="response.responseId"
							class="border-l-4 border-purple-500 pl-3"
						>
							<div class="flex items-center gap-2 mb-1">
								<span class="font-semibold">{{ response.actualUsername }}</span>
								<span class="text-sm text-gray-600">said:</span>
							</div>
							<p class="text-sm text-gray-600 italic">
								"{{ response.answer }}"
							</p>
						</div>
					</div>
				</UCard>
			</div>
		</div>
	</div>
</template>
