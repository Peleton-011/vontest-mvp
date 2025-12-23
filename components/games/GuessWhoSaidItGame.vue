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
	getUserResponse,
	submitAnswer,
	submitGuesses,
	startGuessingPhase,
	getResults,
	completeGame,
} = useGuessWhoSaidIt(props.groupId);

const { isAdmin } = useGroupMembers(computed(() => props.groupId));
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
		.select('user_id, profiles:user_id (username, avatar_url)')
		.eq('group_id', props.groupId);

	groupMembers.value = members?.map((m: any) => ({
		userId: m.user_id,
		username: m.profiles?.username || 'Unknown',
		avatarUrl: m.profiles?.avatar_url || '',
	})) || [];
};

// Drag and drop state
const draggedUserId = ref<string | null>(null);
const user = useSupabaseUser();

// Find user's own response ID
const userOwnResponseId = computed(() => {
	if (!results.value || !user.value) return null;
	const ownResponse = results.value.responses.find((r: any) => r.actualUserId === user.value.id);
	return ownResponse?.responseId || null;
});

// Load active game and user response
const loadActiveGame = async () => {
	const game = await getActiveGame();
	if (game) {
		// Get user's response
		await getUserResponse(game.id);

		// Get results
		const gameResults = await getResults(game.id);
		if (gameResults) {
			responseCount.value = gameResults.responses.length;

			// Show results in guessing phase or if game is completed
			if (game.current_phase === 'guessing' || game.status === 'completed') {
				results.value = gameResults;
			}
		}

		// Load group members for guessing phase
		if (game.current_phase === 'guessing') {
			await loadGroupMembers();

			// Initialize guess form
			if (gameResults) {
				const initialGuesses: Record<string, string> = {};
				gameResults.responses.forEach((r: any) => {
					// Pre-fill user's own answer
					if (user.value && r.actualUserId === user.value.id) {
						initialGuesses[r.responseId] = user.value.id;
					} else {
						initialGuesses[r.responseId] = userResponse.value?.guesses?.[r.responseId] || '';
					}
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

// Drag and drop handlers
const handleDragStart = (userId: string) => {
	draggedUserId.value = userId;
};

const handleDragEnd = () => {
	draggedUserId.value = null;
};

const handleDragOver = (event: DragEvent) => {
	event.preventDefault(); // Allow drop
};

const handleDrop = (responseId: string) => {
	if (draggedUserId.value) {
		// Don't allow changing user's own answer
		if (responseId === userOwnResponseId.value) {
			return;
		}
		guessForm.value[responseId] = draggedUserId.value;
	}
};

const clearGuess = (responseId: string) => {
	// Don't allow clearing user's own answer
	if (responseId === userOwnResponseId.value) {
		return;
	}
	guessForm.value[responseId] = '';
};

// Get username by ID
const getUsernameById = (userId: string) => {
	const member = groupMembers.value.find(m => m.userId === userId);
	return member?.username || 'Unknown';
};

// Get avatar URL by ID
const getAvatarUrlById = (userId: string) => {
	const member = groupMembers.value.find(m => m.userId === userId);
	return member?.avatarUrl || '';
};

onMounted(async () => {
	await loadActiveGame();

	// Subscribe to game instance changes for automatic phase transitions
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
					// Reload game when phase or status changes
					if (payload.new.current_phase !== currentGame.value?.current_phase ||
					    payload.new.status !== currentGame.value?.status) {
						await loadActiveGame();
					}
				}
			)
			.subscribe();

		// Cleanup on unmount
		onUnmounted(() => {
			supabase.removeChannel(channel);
		});
	}
});
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

			</div>

			<!-- Phase 2: Guess Who Said What -->
			<div v-if="currentGame.current_phase === 'guessing'" class="space-y-4">
				<!-- Drag and Drop Guessing Interface -->
				<div v-if="results && currentGame.status === 'active'" class="space-y-6">
					<div class="text-center">
						<p class="text-sm text-gray-600 mb-2">
							Drag people from the right to match them with their answers on the left
						</p>
						<p class="text-xs text-gray-500">
							💡 Your own answer is already matched
						</p>
					</div>

					<!-- Your Own Answer (Separated at Top) -->
					<div v-if="userOwnResponseId" class="pb-4 border-b-2 border-dashed border-blue-300">
						<div class="grid grid-cols-2 gap-4">
							<!-- Your Response -->
							<div class="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300">
								<div class="flex items-center gap-2 mb-2">
									<UBadge color="blue" size="xs">Your Answer</UBadge>
								</div>
								<p class="text-sm italic text-gray-700 dark:text-gray-300">
									"{{ results.responses.find(r => r.responseId === userOwnResponseId)?.answer }}"
								</p>
							</div>

							<!-- Your Profile -->
							<div class="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300">
								<div class="flex items-center gap-3">
									<UAvatar
										:src="user?.user_metadata?.avatar_url || ''"
										:alt="user?.user_metadata?.username || 'You'"
										size="md"
									/>
									<div>
										<p class="font-semibold text-sm">{{ user?.user_metadata?.username || 'You' }}</p>
										<UBadge color="blue" size="xs">You</UBadge>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Other Answers and People (Matching Grid) -->
					<div class="space-y-3">
						<div
							v-for="(response, index) in results.responses.filter(r => r.responseId !== userOwnResponseId)"
							:key="response.responseId"
							class="relative"
						>
							<div class="grid grid-cols-2 gap-4 items-stretch">
								<!-- Left: Response (Drop Zone) -->
								<div
									@dragover="handleDragOver"
									@drop.prevent="handleDrop(response.responseId)"
									:class="[
										'relative p-4 rounded-lg border-2 transition-all min-h-[80px] flex items-center',
										guessForm[response.responseId]
											? 'bg-green-50 dark:bg-green-900/20 border-green-400'
											: 'bg-white dark:bg-gray-800 border-gray-300 hover:border-purple-400 hover:shadow-sm'
									]"
								>
									<div class="flex-1">
										<p class="text-sm italic text-gray-700 dark:text-gray-300 mb-2">
											"{{ response.answer }}"
										</p>

										<!-- Matched User Info (Small) -->
										<div v-if="guessForm[response.responseId]" class="flex items-center gap-2 mt-2">
											<UAvatar
												:src="getAvatarUrlById(guessForm[response.responseId])"
												:alt="getUsernameById(guessForm[response.responseId])"
												size="xs"
											/>
											<span class="text-xs text-gray-600">
												{{ getUsernameById(guessForm[response.responseId]) }}
											</span>
											<UButton
												@click="clearGuess(response.responseId)"
												variant="ghost"
												size="xs"
												icon="i-heroicons-x-mark"
												color="gray"
											/>
										</div>
										<div v-else class="text-xs text-gray-400 mt-2">
											← Drop person here
										</div>
									</div>

									<!-- Connecting Line Indicator -->
									<div v-if="guessForm[response.responseId]" class="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-green-400"></div>
								</div>

								<!-- Right: Person (Draggable) -->
								<div
									:draggable="true"
									@dragstart="handleDragStart(groupMembers.filter(m => m.userId !== user?.id)[index]?.userId)"
									@dragend="handleDragEnd"
									:class="[
										'relative p-4 rounded-lg border-2 transition-all min-h-[80px] flex items-center cursor-move',
										'bg-white dark:bg-gray-800 border-gray-300 hover:border-purple-400 hover:shadow-md',
										draggedUserId === groupMembers.filter(m => m.userId !== user?.id)[index]?.userId ? 'opacity-50 scale-95' : ''
									]"
								>
									<!-- Connecting Line Start -->
									<div class="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-gray-300"></div>

									<div class="flex items-center gap-3 flex-1 ml-2">
										<UAvatar
											:src="groupMembers.filter(m => m.userId !== user?.id)[index]?.avatarUrl"
											:alt="groupMembers.filter(m => m.userId !== user?.id)[index]?.username"
											size="md"
										/>
										<div>
											<p class="font-semibold text-sm">
												{{ groupMembers.filter(m => m.userId !== user?.id)[index]?.username }}
											</p>
										</div>
										<div class="ml-auto">
											<UIcon name="i-heroicons-bars-3" class="w-4 h-4 text-gray-400" />
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<UButton
						@click="handleSubmitGuesses"
						:loading="loading"
						:disabled="Object.values(guessForm).some(v => !v)"
						block
						size="lg"
						class="mt-6"
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

			<!-- Admin Controls -->
			<div v-if="isAdmin && currentGame.status === 'active'" class="pt-6 border-t">
				<div class="space-y-2">
					<UButton
						v-if="currentGame.current_phase === 'submission'"
						variant="outline"
						color="neutral"
						icon="i-heroicons-arrow-right"
						@click="handleStartGuessingPhase"
					>
						Start Guessing Phase
					</UButton>
					<UButton
						variant="outline"
						color="neutral"
						icon="i-heroicons-check-circle"
						@click="handleCompleteGame"
					>
						End Game & Post Results to Chat
					</UButton>
				</div>
			</div>

			<!-- Completed Message -->
			<div v-if="currentGame.status === 'completed'" class="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded">
				<UIcon name="i-heroicons-check-circle" class="w-6 h-6 inline text-green-600 mb-1" />
				<p class="text-green-700 dark:text-green-400 font-semibold">
					Game completed! Results have been posted to the chat.
				</p>
			</div>
		</div>
	</div>
</template>
