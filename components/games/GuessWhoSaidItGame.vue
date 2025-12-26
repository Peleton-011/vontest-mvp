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

// Drag and drop state for reordering lists
const draggedResponseIndex = ref<number | null>(null);
const draggedUserIndex = ref<number | null>(null);
const user = useSupabaseUser();

// Ordered lists for matching
const orderedResponses = ref<any[]>([]);
const orderedUsers = ref<any[]>([]);

// Find user's own response ID
const userOwnResponseId = computed(() => {
	if (!results.value || !user.value) return null;
	const ownResponse = results.value.responses.find((r: any) => r.actualUserId === user.value.id);
	return ownResponse?.responseId || null;
});

// Shuffle array helper (Fisher-Yates algorithm)
const shuffleArray = <T>(array: T[]): T[] => {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
};

// Compute guesses from ordered lists
const computedGuesses = computed(() => {
	const guesses: Record<string, string> = {};

	// Pre-fill user's own answer
	if (userOwnResponseId.value && user.value) {
		guesses[userOwnResponseId.value] = user.value.id;
	}

	// Match by position
	orderedResponses.value.forEach((response, index) => {
		if (orderedUsers.value[index]) {
			guesses[response.responseId] = orderedUsers.value[index].userId;
		}
	});

	return guesses;
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

			// Initialize ordered lists
			if (gameResults) {
				// Filter out user's own response
				const filteredResponses = gameResults.responses.filter(
					(r: any) => r.responseId !== userOwnResponseId.value
				);

				// Filter out current user from the list
				const filteredUsers = groupMembers.value.filter(
					(m: any) => m.userId !== user.value?.id
				);

				// If user has already submitted guesses, restore their order
				if (userResponse.value?.guesses) {
					// Don't shuffle - restore previous order based on saved guesses
					const savedGuesses = userResponse.value.guesses;

					// Keep users in default order
					orderedUsers.value = filteredUsers;

					// Sort responses to match saved guesses
					orderedResponses.value = filteredResponses.slice().sort((a, b) => {
						const aUserId = savedGuesses[a.responseId];
						const bUserId = savedGuesses[b.responseId];
						const aIndex = orderedUsers.value.findIndex(u => u.userId === aUserId);
						const bIndex = orderedUsers.value.findIndex(u => u.userId === bUserId);
						return aIndex - bIndex;
					});
				} else {
					// First time - randomize both lists to avoid any correlation
					orderedResponses.value = shuffleArray(filteredResponses);
					orderedUsers.value = shuffleArray(filteredUsers);
				}
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

	const result = await submitGuesses(currentGame.value.id, computedGuesses.value);

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

// Drag and drop handlers for responses list
const handleResponseDragStart = (index: number) => {
	draggedResponseIndex.value = index;
};

const handleResponseDragOver = (event: DragEvent, index: number) => {
	event.preventDefault();
};

const handleResponseDrop = (targetIndex: number) => {
	if (draggedResponseIndex.value === null) return;

	const item = orderedResponses.value[draggedResponseIndex.value];
	orderedResponses.value.splice(draggedResponseIndex.value, 1);
	orderedResponses.value.splice(targetIndex, 0, item);

	draggedResponseIndex.value = null;
};

const handleResponseDragEnd = () => {
	draggedResponseIndex.value = null;
};

// Drag and drop handlers for users list
const handleUserDragStart = (index: number) => {
	draggedUserIndex.value = index;
};

const handleUserDragOver = (event: DragEvent, index: number) => {
	event.preventDefault();
};

const handleUserDrop = (targetIndex: number) => {
	if (draggedUserIndex.value === null) return;

	const item = orderedUsers.value[draggedUserIndex.value];
	orderedUsers.value.splice(draggedUserIndex.value, 1);
	orderedUsers.value.splice(targetIndex, 0, item);

	draggedUserIndex.value = null;
};

const handleUserDragEnd = () => {
	draggedUserIndex.value = null;
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

const showResults = computed(() => !!results.value && (!!userResponse.value || currentGame.value?.status === 'completed'));
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
					{{ currentGame.current_phase === 'submission' ? 'Submit Answers' : 'Guess Who Said What' }}
				</UBadge>
			</div>

			<!-- Game Prompt -->
			<UCard class="overflow-hidden relative">
				<!-- Background Image (if provided) -->
				<div
					v-if="(currentGame.prompt as GuessWhoSaidItPrompt).visual?.type === 'image'"
					class="absolute inset-0 bg-cover bg-center opacity-20"
					:style="{
						backgroundImage: `url(${(currentGame.prompt as GuessWhoSaidItPrompt).visual?.value})`
					}"
				></div>

				<div class="text-center py-6 relative z-10">
					<!-- Custom Emoji Visual (if provided) -->
					<div v-if="(currentGame.prompt as GuessWhoSaidItPrompt).visual?.type === 'emoji'" class="text-6xl mb-4">
						{{ (currentGame.prompt as GuessWhoSaidItPrompt).visual?.value }}
					</div>
					<!-- Default Emoji (if no visual) -->
					<div v-else class="text-3xl mb-2">❓</div>

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
							<p class="text-sm text-gray-400">
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
					<p class="text-sm text-gray-400 mb-2">
						Drag items vertically to reorder both lists. The first answer matches the first person, second to second, etc.
					</p>
					<p class="text-xs text-gray-500">
						💡 Your own answer is already matched
					</p>
				</div>

				<!-- Your Own Answer (Separated at Top) -->
				<div v-if="userOwnResponseId" class="pb-4 mb-4 border-b-2 border-dashed border-blue-300">
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

				<!-- Two Sortable Lists -->
				<div class="grid grid-cols-2 gap-4">
					<!-- Left Column: Responses (Sortable) -->
					<div class="space-y-2">
						<div class="text-center mb-3">
							<UBadge color="purple">Answers</UBadge>
						</div>
						<div
							v-for="(response, index) in orderedResponses"
							:key="response.responseId"
							:draggable="true"
							@dragstart="handleResponseDragStart(index)"
							@dragover.prevent="handleResponseDragOver($event, index)"
							@drop.prevent="handleResponseDrop(index)"
							@dragend="handleResponseDragEnd"
							:class="[
								'relative p-4 rounded-lg border-2 transition-all min-h-[80px] cursor-move',
								'bg-white dark:bg-gray-800 border-gray-300 hover:border-purple-400 hover:shadow-md',
								draggedResponseIndex === index ? 'opacity-50 scale-95' : ''
							]"
						>
							<div class="flex items-start gap-2">
								<div class="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-xs font-bold text-purple-600">
									{{ index + 1 }}
								</div>
								<p class="text-sm italic text-gray-700 dark:text-gray-300 flex-1">
									"{{ response.answer }}"
								</p>
								<div class="flex-shrink-0">
									<UIcon name="i-heroicons-bars-3" class="w-4 h-4 text-gray-400" />
								</div>
							</div>

							<!-- Connecting Line -->
							<div class="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-0.5 bg-purple-300"></div>
						</div>
					</div>

					<!-- Right Column: Users (Sortable) -->
					<div class="space-y-2">
						<div class="text-center mb-3">
							<UBadge color="green">People</UBadge>
						</div>
						<div
							v-for="(member, index) in orderedUsers"
							:key="member.userId"
							:draggable="true"
							@dragstart="handleUserDragStart(index)"
							@dragover.prevent="handleUserDragOver($event, index)"
							@drop.prevent="handleUserDrop(index)"
							@dragend="handleUserDragEnd"
							:class="[
								'relative p-4 rounded-lg border-2 transition-all min-h-[80px] cursor-move',
								'bg-white dark:bg-gray-800 border-gray-300 hover:border-green-400 hover:shadow-md',
								draggedUserIndex === index ? 'opacity-50 scale-95' : ''
							]"
						>
							<!-- Connecting Line -->
							<div class="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-0.5 bg-green-300"></div>

							<div class="flex items-center gap-3 ml-1">
								<div class="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-xs font-bold text-green-600">
									{{ index + 1 }}
								</div>
								<UAvatar
									:src="member.avatarUrl"
									:alt="member.username"
									size="sm"
								/>
								<p class="font-semibold text-sm flex-1">
									{{ member.username }}
								</p>
								<div class="flex-shrink-0">
									<UIcon name="i-heroicons-bars-3" class="w-4 h-4 text-gray-400" />
								</div>
							</div>
						</div>
					</div>
				</div>

				<UButton
					@click="handleSubmitGuesses"
					:loading="loading"
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
							<p class="text-sm text-gray-400">
								Waiting for the game to end to see results...
							</p>
						</div>
					</UCard>
				</div>
			</div>
		</template>

		<!-- Admin Controls Slot -->
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
			<!-- Top Guesser -->
			<UCard v-if="results.topGuesser" class="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-800/20">
				<div class="text-center py-6">
					<div class="text-4xl mb-3">🏆</div>
					<p class="text-lg font-semibold mb-1">Top Guesser</p>
					<p class="text-2xl font-bold text-yellow-600">{{ results.topGuesser.username }}</p>
					<p class="text-sm text-gray-400 mt-1">
						{{ results.topGuesser.correct }} correct guesses
					</p>
				</div>
			</UCard>

			<!-- All Guesses Performance -->
			<div>
				<h4 class="font-semibold mb-4">Guess Accuracy</h4>
				<div class="space-y-3">
					<div
						v-for="guesser in results.guesses"
						:key="guesser.guesserUserId"
						class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded"
					>
						<span class="font-semibold">{{ guesser.guesserUsername }}</span>
						<div class="flex items-center gap-3">
							<span class="text-sm text-gray-400">
								{{ guesser.correctGuesses }}/{{ guesser.totalGuesses }} correct
							</span>
							<UBadge :color="guesser.accuracy >= 70 ? 'green' : guesser.accuracy >= 40 ? 'yellow' : 'red'">
								{{ Math.round(guesser.accuracy) }}%
							</UBadge>
						</div>
					</div>
				</div>
			</div>

			<!-- All Responses -->
			<div v-if="results.responses.length > 0">
				<h4 class="font-semibold mb-4">All Responses</h4>
				<div class="space-y-3">
					<div
						v-for="response in results.responses"
						:key="response.responseId"
						class="border-l-4 border-purple-500 pl-3"
					>
						<div class="flex items-center gap-2 mb-1">
							<span class="font-semibold">{{ response.actualUsername }}</span>
							<span class="text-sm text-gray-400">said:</span>
						</div>
						<p class="text-sm text-gray-400 italic">
							"{{ response.answer }}"
						</p>
					</div>
				</div>
			</div>
		</template>
	</GamesGameLayout>
</template>
