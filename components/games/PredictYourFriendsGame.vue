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
	submitOracleSelections,
	startOracleSelectionPhase,
	getResults,
	completeGame,
} = usePredictYourFriends(props.groupId);

const { isAdmin, members } = useGroupMembers(computed(() => props.groupId));
const supabase = useSupabaseClient();
const user = useSupabaseUser();

const gameMetadata = getGameMetadata('predict_your_friends');

// Forms
const predictionForm = reactive({
	prediction: '',
});

const oracleForm = reactive({
	answer: '',
});

// Oracle selection state
const selectedPredictions = ref<Set<string>>(new Set());

const results = ref<any>(null);
const responseCount = ref(0);

// Get Oracle profile info
const oracleProfile = computed(() => {
	if (!currentGame.value) return null;
	const prompt = currentGame.value.prompt as PredictYourFriendsPrompt;
	const oracleMember = members.value.find(m => m.user_id === prompt.oracleUserId);
	return oracleMember || null;
});

// Load active game
const loadActiveGame = async () => {
	const game = await getActiveGame();
	if (game) {
		await getUserResponse(game.id);

		// Load results for oracle selection phase or completed game
		if (game.current_phase === 'oracle_selection' || game.status === 'completed') {
			const gameResults = await getResults(game.id);
			if (gameResults) {
				responseCount.value = gameResults.responses.length;
				results.value = gameResults;

				// Initialize selected predictions from oracle's saved selections
				if (isOracle.value && userResponse.value?.response_data?.selectedUserIds) {
					selectedPredictions.value = new Set(userResponse.value.response_data.selectedUserIds);
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

// Toggle prediction selection (for oracle)
const togglePredictionSelection = (userId: string) => {
	if (selectedPredictions.value.has(userId)) {
		selectedPredictions.value.delete(userId);
	} else {
		selectedPredictions.value.add(userId);
	}
};

// Submit oracle selections
const handleSubmitOracleSelections = async () => {
	if (!currentGame.value) return;

	const result = await submitOracleSelections(
		currentGame.value.id,
		Array.from(selectedPredictions.value)
	);

	if (result.success) {
		await loadActiveGame();
	}
};

// Start oracle selection phase (admin)
const handleStartOracleSelectionPhase = async () => {
	if (!currentGame.value) return;

	const result = await startOracleSelectionPhase(currentGame.value.id);
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
			<div v-if="currentGame.current_phase" class="text-center mb-3 md:mb-4">
				<UBadge
					:color="currentGame.current_phase === 'prediction' ? 'blue' : currentGame.current_phase === 'oracle_selection' ? 'yellow' : 'green'"
					size="md"
					class="md:size-lg text-xs md:text-sm"
				>
					<span class="hidden sm:inline">
						{{
							currentGame.current_phase === 'prediction'
								? '📝 Phase 1: Make Predictions'
								: currentGame.current_phase === 'oracle_selection'
									? '⭐ Phase 2: Oracle Selection'
									: '📊 Results'
						}}
					</span>
					<span class="sm:hidden">
						{{
							currentGame.current_phase === 'prediction'
								? '📝 Predict'
								: currentGame.current_phase === 'oracle_selection'
									? '⭐ Oracle'
									: '📊 Results'
						}}
					</span>
				</UBadge>
			</div>

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

				<div class="text-center py-4 md:py-6 relative z-10">
					<!-- Custom Emoji Visual (if provided) -->
					<div v-if="(currentGame.prompt as PredictYourFriendsPrompt).visual?.type === 'emoji'" class="text-4xl md:text-6xl mb-3 md:mb-4">
						{{ (currentGame.prompt as PredictYourFriendsPrompt).visual?.value }}
					</div>
					<!-- Default Emoji (if no visual) -->
					<div v-else class="text-2xl md:text-3xl mb-1.5 md:mb-2">💡</div>

					<h3 class="text-lg md:text-xl font-semibold mb-3 md:mb-4">
						{{ (currentGame.prompt as PredictYourFriendsPrompt).question }}
					</h3>

					<!-- Oracle Display - Prominently show who the Oracle is -->
					<div class="mt-4 md:mt-6 p-3 md:p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border-2 border-indigo-300 dark:border-indigo-700">
						<p class="text-[10px] md:text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2 md:mb-3">
							{{ isOracle ? '⭐ YOU ARE THE ORACLE' : '🔮 THE ORACLE' }}
						</p>
						<div class="flex items-center justify-center gap-2 md:gap-3">
							<UAvatar
								v-if="oracleProfile"
								:src="oracleProfile.avatar_url"
								:alt="oracleProfile.username"
								size="md"
								class="md:size-lg ring-2 ring-indigo-400 dark:ring-indigo-500"
							/>
							<div>
								<p class="font-bold text-base md:text-lg text-indigo-900 dark:text-indigo-100">
									{{ oracleProfile?.username || 'Loading...' }}
								</p>
								<p class="text-[10px] md:text-xs text-indigo-600 dark:text-indigo-400">
									{{ isOracle ? 'Answer truthfully!' : 'Predict their answer' }}
								</p>
							</div>
						</div>
					</div>
				</div>
			</UCard>

			<!-- Oracle View: Submit Answer -->
			<div v-if="isOracle && !userResponse && currentGame.status === 'active'" class="space-y-3 md:space-y-4">
				<UCard class="bg-yellow-50 dark:bg-yellow-900/20">
					<div class="text-center py-3 md:py-4">
						<div class="text-2xl md:text-3xl mb-1.5 md:mb-2">⭐</div>
						<p class="font-semibold text-sm md:text-base mb-1.5 md:mb-2">You are the Oracle!</p>
						<p class="text-xs md:text-sm text-gray-400">
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

			<!-- Oracle View: Answer Submitted (Prediction Phase) -->
			<div v-if="isOracle && userResponse && currentGame.status === 'active' && currentGame.current_phase === 'prediction'" class="space-y-3 md:space-y-4">
				<UCard class="bg-blue-50 dark:bg-blue-900/20">
					<div class="text-center py-4 md:py-6">
						<div class="text-2xl md:text-3xl mb-2 md:mb-3">✅</div>
						<p class="font-semibold text-sm md:text-base mb-1.5 md:mb-2">Answer Submitted!</p>
						<p class="text-xs md:text-sm text-gray-400">
							Your answer: <span class="font-semibold text-gray-600 dark:text-gray-300">"{{ userResponse.response_data.oracleAnswer }}"</span>
						</p>
						<p class="text-xs md:text-sm text-gray-400 mt-1.5 md:mt-2">
							Waiting for everyone to make their predictions...
						</p>
					</div>
				</UCard>
			</div>

			<!-- Oracle View: Selection Phase -->
			<div v-if="isOracle && currentGame.current_phase === 'oracle_selection'" class="space-y-3 md:space-y-4">
				<UCard class="bg-yellow-50 dark:bg-yellow-900/20">
					<div class="text-center py-3 md:py-4">
						<div class="text-2xl md:text-3xl mb-1.5 md:mb-2">⭐</div>
						<p class="font-semibold text-sm md:text-base mb-1.5 md:mb-2">Choose the Correct Predictions!</p>
						<p class="text-xs md:text-sm text-gray-400">
							Your answer was: <span class="font-semibold text-gray-600 dark:text-gray-300">"{{ userResponse?.response_data?.oracleAnswer }}"</span>
						</p>
						<p class="text-xs md:text-sm text-gray-400 mt-1">
							Select which predictions best match what you meant.
						</p>
					</div>
				</UCard>

				<!-- Predictions to Review -->
				<div v-if="results && results.predictions.length > 0" class="space-y-2 md:space-y-3">
					<div
						v-for="prediction in results.predictions"
						:key="prediction.userId"
						:class="[
							'p-3 md:p-4 rounded-lg border-2 cursor-pointer transition-all touch-manipulation active:scale-95',
							selectedPredictions.has(prediction.userId)
								? 'border-green-500 bg-green-50 dark:bg-green-900/20'
								: 'border-gray-300 dark:border-gray-600 md:hover:border-green-300 dark:md:hover:border-green-700'
						]"
						@click="togglePredictionSelection(prediction.userId)"
					>
						<div class="flex items-start justify-between">
							<div class="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
								<UAvatar
									:src="prediction.avatarUrl"
									:alt="prediction.username"
									size="sm"
									class="md:size-md shrink-0"
								/>
								<div class="flex-1 min-w-0">
									<p class="font-semibold text-xs md:text-sm">{{ prediction.username }}</p>
									<p class="text-xs md:text-sm italic text-gray-600 dark:text-gray-400 mt-0.5 md:mt-1">
										"{{ prediction.prediction }}"
									</p>
								</div>
							</div>
							<div v-if="selectedPredictions.has(prediction.userId)" class="text-green-500 text-lg md:text-xl shrink-0">
								✓
							</div>
						</div>
					</div>
				</div>

				<UButton
					@click="handleSubmitOracleSelections"
					:loading="loading"
					block
					size="lg"
				>
					Submit Selections ({{ selectedPredictions.size }} selected)
				</UButton>
			</div>

			<!-- Oracle View: Selections Submitted -->
			<div v-if="isOracle && userResponse?.response_data?.selectedUserIds && currentGame.status === 'active' && currentGame.current_phase === 'oracle_selection'" class="space-y-3 md:space-y-4">
				<UCard class="bg-blue-50 dark:bg-blue-900/20">
					<div class="text-center py-4 md:py-6">
						<div class="text-2xl md:text-3xl mb-2 md:mb-3">✅</div>
						<p class="font-semibold text-sm md:text-base mb-1.5 md:mb-2">Selections Submitted!</p>
						<p class="text-xs md:text-sm text-gray-400">
							You selected {{ userResponse.response_data.selectedUserIds.length }} correct {{ userResponse.response_data.selectedUserIds.length === 1 ? 'prediction' : 'predictions' }}
						</p>
						<p class="text-xs md:text-sm text-gray-400 mt-1.5 md:mt-2">
							Waiting for the game to end...
						</p>
					</div>
				</UCard>
			</div>

			<!-- Predictor View: Submit Prediction -->
			<div v-if="!isOracle && !userResponse && currentGame.status === 'active'" class="space-y-3 md:space-y-4">
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
			<div v-if="!isOracle && userResponse && currentGame.status === 'active'" class="space-y-3 md:space-y-4">
				<UCard class="bg-blue-50 dark:bg-blue-900/20">
					<div class="text-center py-4 md:py-6">
						<div class="text-2xl md:text-3xl mb-2 md:mb-3">✅</div>
						<p class="font-semibold text-sm md:text-base mb-1.5 md:mb-2">Prediction Submitted!</p>
						<p class="text-xs md:text-sm text-gray-400">
							You predicted: <span class="font-semibold text-gray-600 dark:text-gray-300">"{{ userResponse.response_data.prediction }}"</span>
						</p>
						<p class="text-xs md:text-sm text-gray-400 mt-1.5 md:mt-2">
							{{
								currentGame.current_phase === 'oracle_selection'
									? 'The Oracle is reviewing predictions...'
									: 'Waiting for the game to end...'
							}}
						</p>
					</div>
				</UCard>
			</div>
		</template>

		<!-- Admin Controls Slot -->
		<template #admin-controls>
			<UButton
				v-if="currentGame.current_phase !== 'oracle_selection' && currentGame.status === 'active'"
				variant="outline"
				size="sm"
				icon="i-heroicons-arrow-right"
				:loading="loading"
				@click="handleStartOracleSelectionPhase"
			>
				Start Oracle Selection
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
			<!-- Oracle Reveal -->
			<UCard class="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-800/20">
				<div class="text-center py-4 md:py-6">
					<div class="text-3xl md:text-4xl mb-2 md:mb-3">⭐</div>
					<p class="text-base md:text-lg font-semibold mb-1">The Oracle Answered</p>
					<p class="text-xl md:text-2xl font-bold text-yellow-600 mb-1.5 md:mb-2">
						"{{ results.correctAnswer }}"
					</p>
					<div class="flex items-center justify-center gap-2 mt-2 md:mt-3">
						<UAvatar
							:src="results.oracleAvatarUrl"
							:alt="results.oracleUsername"
							size="sm"
							class="md:size-md"
						/>
						<span class="text-xs md:text-sm text-gray-600 dark:text-gray-400">
							{{ results.oracleUsername }}
						</span>
					</div>
				</div>
			</UCard>

			<!-- Correct Predictors -->
			<UCard v-if="results.correctPredictors && results.correctPredictors.length > 0" class="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-800/20">
				<div class="text-center py-3 md:py-4">
					<div class="text-2xl md:text-3xl mb-2 md:mb-3">🎯</div>
					<p class="text-base md:text-lg font-semibold mb-2 md:mb-3">Correct Predictions</p>
					<div class="space-y-1.5 md:space-y-2">
						<div
							v-for="predictor in results.correctPredictors"
							:key="predictor.userId"
							class="flex items-center justify-center gap-2 md:gap-3"
						>
							<span class="text-base md:text-lg">✓</span>
							<span class="font-semibold text-xs md:text-sm">{{ predictor.username }}</span>
							<UBadge color="green" size="xs" class="md:size-sm">+{{ predictor.points }} points</UBadge>
						</div>
					</div>
				</div>
			</UCard>

			<!-- No Correct Predictions -->
			<UCard v-else class="bg-gray-50 dark:bg-gray-800">
				<div class="text-center py-4 md:py-6">
					<div class="text-2xl md:text-3xl mb-2 md:mb-3">😅</div>
					<p class="font-semibold text-sm md:text-base text-gray-600 dark:text-gray-400">
						No one guessed correctly!
					</p>
				</div>
			</UCard>

			<!-- All Predictions -->
			<div v-if="results.predictions && results.predictions.length > 0">
				<h4 class="font-semibold mb-3 md:mb-4 text-sm md:text-base">All Predictions</h4>
				<div class="space-y-2 md:space-y-3">
					<div
						v-for="prediction in results.predictions"
						:key="prediction.userId"
						:class="[
							'p-3 md:p-4 rounded-lg border-l-4',
							prediction.isCorrect
								? 'border-green-500 bg-green-50 dark:bg-green-900/20'
								: 'border-red-500 bg-red-50 dark:bg-red-900/20'
						]"
					>
						<div class="flex items-start justify-between gap-2">
							<div class="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
								<UAvatar
									:src="prediction.avatarUrl"
									:alt="prediction.username"
									size="xs"
									class="md:size-sm shrink-0"
								/>
								<div class="flex-1 min-w-0">
									<p class="font-semibold text-xs md:text-sm">{{ prediction.username }}</p>
									<p class="text-xs md:text-sm italic text-gray-600 dark:text-gray-400">
										"{{ prediction.prediction }}"
									</p>
								</div>
							</div>
							<UBadge size="xs" class="md:size-sm shrink-0" :color="prediction.isCorrect ? 'green' : 'red'">
								<span class="hidden sm:inline">{{ prediction.isCorrect ? '✓ Correct' : '✗ Wrong' }}</span>
								<span class="sm:hidden">{{ prediction.isCorrect ? '✓' : '✗' }}</span>
							</UBadge>
						</div>
					</div>
				</div>
			</div>
		</template>
	</GamesGameLayout>
</template>
