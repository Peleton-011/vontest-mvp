<script setup lang="ts">
import type { PredictYourFriendsPrompt } from '~/composables/games/usePredictYourFriends';
import { getGameMetadata } from '~/types/games';

const props = defineProps<{
	groupId: string;
}>();

const {
	loading,
	error,
	currentGame,
	userResponse,
	isOracle,
	getActiveGame,
	getUserResponse,
	submitPrediction,
	submitOracleAnswer,
	getResults,
	completeGame,
} = usePredictYourFriends(props.groupId);

const { isAdmin } = useGroupMembers(computed(() => props.groupId));
const supabase = useSupabaseClient();

const gameMetadata = getGameMetadata('predict_your_friends');

// Forms
const predictionForm = reactive({
	prediction: '',
});

const oracleForm = reactive({
	answer: '',
});

const results = ref<any>(null);
const responseCount = ref(0);

// Load active game
const loadActiveGame = async () => {
	const game = await getActiveGame();
	if (game) {
		await getUserResponse(game.id);

		// Load results if game is completed
		if (game.status === 'completed') {
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

// Submit prediction
const handleSubmitPrediction = async () => {
	if (!currentGame.value || !predictionForm.prediction.trim()) return;

	const result = await submitPrediction(currentGame.value.id, predictionForm.prediction);

	if (result.success) {
		await loadActiveGame();
	}
};

// Submit oracle answer
const handleSubmitOracleAnswer = async () => {
	if (!currentGame.value || !oracleForm.answer.trim()) return;

	const result = await submitOracleAnswer(currentGame.value.id, oracleForm.answer);

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
					if (payload.new.status !== currentGame.value?.status) {
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
			<!-- Game Prompt -->
			<UCard class="overflow-hidden relative">
				<!-- Background Image (if provided) -->
				<div
					v-if="(currentGame.prompt as PredictYourFriendsPrompt).visual?.type === 'image'"
					class="absolute inset-0 bg-cover bg-center opacity-20"
					:style="{
						backgroundImage: `url(${(currentGame.prompt as PredictYourFriendsPrompt).visual?.value})`
					}"
				></div>

				<div class="text-center py-6 relative z-10">
					<!-- Custom Emoji Visual (if provided) -->
					<div v-if="(currentGame.prompt as PredictYourFriendsPrompt).visual?.type === 'emoji'" class="text-6xl mb-4">
						{{ (currentGame.prompt as PredictYourFriendsPrompt).visual?.value }}
					</div>
					<!-- Default Emoji (if no visual) -->
					<div v-else class="text-3xl mb-2">💡</div>

					<h3 class="text-xl font-semibold mb-4">
						{{ (currentGame.prompt as PredictYourFriendsPrompt).question }}
					</h3>

					<!-- Oracle Badge -->
					<UBadge
						v-if="isOracle"
						color="yellow"
						size="lg"
					>
						⭐ You are the Oracle
					</UBadge>
					<p v-else class="text-sm text-gray-400">
						Predict what the Oracle will answer!
					</p>
				</div>
			</UCard>

			<!-- Oracle View: Submit Answer -->
			<div v-if="isOracle && !userResponse && currentGame.status === 'active'" class="space-y-4">
				<UCard class="bg-yellow-50 dark:bg-yellow-900/20">
					<div class="text-center py-4">
						<div class="text-3xl mb-2">⭐</div>
						<p class="font-semibold mb-2">You are the Oracle!</p>
						<p class="text-sm text-gray-400">
							Everyone is trying to predict your answer. Submit what you would actually choose!
						</p>
					</div>
				</UCard>

				<UFormField label="Your Answer">
					<UInput
						v-model="oracleForm.answer"
						placeholder="Enter your answer..."
						size="lg"
					/>
				</UFormField>

				<UButton
					@click="handleSubmitOracleAnswer"
					:loading="loading"
					:disabled="!oracleForm.answer.trim()"
					block
					size="lg"
				>
					Submit Answer
				</UButton>
			</div>

			<!-- Oracle View: Answer Submitted -->
			<div v-if="isOracle && userResponse && currentGame.status === 'active'" class="space-y-4">
				<UCard class="bg-blue-50 dark:bg-blue-900/20">
					<div class="text-center py-6">
						<div class="text-3xl mb-3">✅</div>
						<p class="font-semibold mb-2">Answer Submitted!</p>
						<p class="text-sm text-gray-400">
							Your answer: <span class="font-semibold text-gray-600 dark:text-gray-300">"{{ userResponse.response_data.oracleAnswer }}"</span>
						</p>
						<p class="text-sm text-gray-400 mt-2">
							Waiting for everyone to make their predictions...
						</p>
					</div>
				</UCard>
			</div>

			<!-- Predictor View: Submit Prediction -->
			<div v-if="!isOracle && !userResponse && currentGame.status === 'active'" class="space-y-4">
				<UFormField label="Your Prediction">
					<UInput
						v-model="predictionForm.prediction"
						placeholder="What do you think they'll answer?"
						size="lg"
					/>
				</UFormField>

				<UButton
					@click="handleSubmitPrediction"
					:loading="loading"
					:disabled="!predictionForm.prediction.trim()"
					block
					size="lg"
				>
					Submit Prediction
				</UButton>
			</div>

			<!-- Predictor View: Prediction Submitted -->
			<div v-if="!isOracle && userResponse && currentGame.status === 'active'" class="space-y-4">
				<UCard class="bg-blue-50 dark:bg-blue-900/20">
					<div class="text-center py-6">
						<div class="text-3xl mb-3">✅</div>
						<p class="font-semibold mb-2">Prediction Submitted!</p>
						<p class="text-sm text-gray-400">
							You predicted: <span class="font-semibold text-gray-600 dark:text-gray-300">"{{ userResponse.response_data.prediction }}"</span>
						</p>
						<p class="text-sm text-gray-400 mt-2">
							Waiting for the game to end...
						</p>
					</div>
				</UCard>
			</div>
		</template>

		<!-- Results Slot -->
		<template #results>
			<!-- Oracle Reveal -->
			<UCard class="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-800/20">
				<div class="text-center py-6">
					<div class="text-4xl mb-3">⭐</div>
					<p class="text-lg font-semibold mb-1">The Oracle Answered</p>
					<p class="text-2xl font-bold text-yellow-600 mb-2">
						"{{ results.correctAnswer }}"
					</p>
					<div class="flex items-center justify-center gap-2 mt-3">
						<UAvatar
							:src="results.oracleAvatarUrl"
							:alt="results.oracleUsername"
							size="md"
						/>
						<span class="text-sm text-gray-600 dark:text-gray-400">
							{{ results.oracleUsername }}
						</span>
					</div>
				</div>
			</UCard>

			<!-- Correct Predictors -->
			<UCard v-if="results.correctPredictors && results.correctPredictors.length > 0" class="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-800/20">
				<div class="text-center py-4">
					<div class="text-3xl mb-3">🎯</div>
					<p class="text-lg font-semibold mb-3">Correct Predictions</p>
					<div class="space-y-2">
						<div
							v-for="predictor in results.correctPredictors"
							:key="predictor.userId"
							class="flex items-center justify-center gap-3"
						>
							<span class="text-lg">✓</span>
							<span class="font-semibold">{{ predictor.username }}</span>
							<UBadge color="green">+{{ predictor.points }} points</UBadge>
						</div>
					</div>
				</div>
			</UCard>

			<!-- No Correct Predictions -->
			<UCard v-else class="bg-gray-50 dark:bg-gray-800">
				<div class="text-center py-6">
					<div class="text-3xl mb-3">😅</div>
					<p class="font-semibold text-gray-600 dark:text-gray-400">
						No one guessed correctly!
					</p>
				</div>
			</UCard>

			<!-- All Predictions -->
			<div v-if="results.predictions && results.predictions.length > 0">
				<h4 class="font-semibold mb-4">All Predictions</h4>
				<div class="space-y-3">
					<div
						v-for="prediction in results.predictions"
						:key="prediction.userId"
						:class="[
							'p-4 rounded-lg border-l-4',
							prediction.isCorrect
								? 'border-green-500 bg-green-50 dark:bg-green-900/20'
								: 'border-red-500 bg-red-50 dark:bg-red-900/20'
						]"
					>
						<div class="flex items-start justify-between">
							<div class="flex items-center gap-3">
								<UAvatar
									:src="prediction.avatarUrl"
									:alt="prediction.username"
									size="sm"
								/>
								<div>
									<p class="font-semibold">{{ prediction.username }}</p>
									<p class="text-sm italic text-gray-600 dark:text-gray-400">
										"{{ prediction.prediction }}"
									</p>
								</div>
							</div>
							<UBadge :color="prediction.isCorrect ? 'green' : 'red'">
								{{ prediction.isCorrect ? '✓ Correct' : '✗ Wrong' }}
							</UBadge>
						</div>
					</div>
				</div>
			</div>
		</template>
	</GamesGameLayout>
</template>
