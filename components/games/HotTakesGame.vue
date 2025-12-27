<script setup lang="ts">
import { GAME_TYPES, type GameType } from '~/types/games';
import type { HotTakesPrompt } from '~/composables/games/useHotTakes';

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
	submitResponse,
	getResults,
	completeGame,
} = useHotTakes(props.groupId);

const { isAdmin } = useGroupMembers(computed(() => props.groupId));
const supabase = useSupabaseClient();

const responseForm = reactive({
	stance: '' as 'agree' | 'disagree' | 'neutral' | '',
	reasoning: '',
});

const results = ref<any>(null);
const responseCount = ref(0);

const gameMetadata = computed(() => GAME_TYPES['hot_takes']);

// Load active game and user response
const loadActiveGame = async () => {
	const game = await getActiveGame();
	if (game) {
		await getUserResponse(game.id);

		// Get results
		const gameResults = await getResults(game.id);
		if (gameResults) {
			responseCount.value = gameResults.responses.length;

			// Only show full results if user has responded or game is completed
			if (userResponse.value || game.status === 'completed') {
				results.value = gameResults;
			}
		}
	}
};

// Submit response
const handleSubmitResponse = async () => {
	if (!currentGame.value || !responseForm.stance) return;

	const result = await submitResponse(currentGame.value.id, {
		stance: responseForm.stance,
		reasoning: responseForm.reasoning || undefined,
	});

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

// Realtime subscription channel
const realtimeChannel = ref<ReturnType<typeof supabase.channel> | null>(null);

onMounted(async () => {
	await loadActiveGame();

	// Subscribe to game instance changes for automatic completion
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
					// Reload game when status changes
					if (payload.new.status !== currentGame.value?.status) {
						await loadActiveGame();
					}
				}
			)
			.subscribe();
	}
});

// Cleanup on unmount
onUnmounted(() => {
	if (realtimeChannel.value) {
		supabase.removeChannel(realtimeChannel.value);
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
			<!-- Game Prompt -->
			<UCard class="overflow-hidden relative">
				<!-- Background Image (if provided) -->
				<div
					v-if="(currentGame.prompt as HotTakesPrompt).visual?.type === 'image'"
					class="absolute inset-0 bg-cover bg-center opacity-20"
					:style="{
						backgroundImage: `url(${(currentGame.prompt as HotTakesPrompt).visual?.value})`
					}"
				></div>

				<div class="text-center py-6 relative z-10">
					<!-- Custom Emoji Visual (if provided) -->
					<div v-if="(currentGame.prompt as HotTakesPrompt).visual?.type === 'emoji'" class="text-6xl mb-4">
						{{ (currentGame.prompt as HotTakesPrompt).visual?.value }}
					</div>
					<!-- Default Emoji (if no visual) -->
					<div v-else class="text-3xl mb-2">🔥</div>

					<p class="text-base md:text-xl font-semibold">
						{{ (currentGame.prompt as HotTakesPrompt).statement }}
					</p>
				</div>
			</UCard>

			<!-- Response Form (if not already responded) -->
			<div v-if="!userResponse && currentGame.status === 'active'" class="space-y-4">
				<!-- Stance Selection -->
				<div class="grid grid-cols-3 gap-2 md:gap-3">
					<UCard
						:class="[
							'cursor-pointer transition-all text-center p-3 md:p-4 touch-manipulation active:scale-95',
							responseForm.stance === 'agree' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' : 'md:hover:scale-105'
						]"
						@click="responseForm.stance = 'agree'"
					>
						<div class="text-2xl md:text-3xl mb-1 md:mb-2">✅</div>
						<div class="text-sm md:text-base font-semibold">Agree</div>
					</UCard>

					<UCard
						:class="[
							'cursor-pointer transition-all text-center p-3 md:p-4 touch-manipulation active:scale-95',
							responseForm.stance === 'neutral' ? 'ring-2 ring-gray-500 bg-gray-50 dark:bg-gray-900/20' : 'md:hover:scale-105'
						]"
						@click="responseForm.stance = 'neutral'"
					>
						<div class="text-2xl md:text-3xl mb-1 md:mb-2">🤷</div>
						<div class="text-sm md:text-base font-semibold">Neutral</div>
					</UCard>

					<UCard
						:class="[
							'cursor-pointer transition-all text-center p-3 md:p-4 touch-manipulation active:scale-95',
							responseForm.stance === 'disagree' ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' : 'md:hover:scale-105'
						]"
						@click="responseForm.stance = 'disagree'"
					>
						<div class="text-2xl md:text-3xl mb-1 md:mb-2">❌</div>
						<div class="text-sm md:text-base font-semibold">Disagree</div>
					</UCard>
				</div>

				<!-- Optional Reasoning -->
				<UFormField label="Explain your reasoning (optional)">
					<UTextarea
						v-model="responseForm.reasoning"
						placeholder="Why do you feel this way?"
						:rows="3"
					/>
				</UFormField>

				<UButton
					@click="handleSubmitResponse"
					:loading="loading"
					:disabled="!responseForm.stance"
					block
					size="lg"
				>
					Submit Response
				</UButton>
			</div>
		</template>

		<!-- Results Slot -->
		<template #results>
			<!-- User's Response -->
			<UCard class="bg-blue-50 dark:bg-blue-900/20">
				<div class="flex items-center gap-3">
					<div class="text-2xl">
						{{ userResponse.stance === 'agree' ? '✅' : userResponse.stance === 'disagree' ? '❌' : '🤷' }}
					</div>
					<div class="flex-1">
						<p class="font-semibold">
							You {{ userResponse.stance === 'agree' ? 'agreed' : userResponse.stance === 'disagree' ? 'disagreed' : 'stayed neutral' }}
						</p>
						<p v-if="userResponse.reasoning" class="text-sm text-gray-400 mt-1">
							"{{ userResponse.reasoning }}"
						</p>
					</div>
				</div>
			</UCard>

			<!-- Vote Breakdown -->
			<div class="space-y-6">
				<div>
					<h4 class="font-semibold mb-4">Vote Distribution</h4>
					<div class="space-y-3">
						<div class="flex items-center gap-3">
							<span class="text-2xl">✅</span>
							<div class="flex-1">
								<div class="flex justify-between mb-1">
									<span>Agree</span>
									<span class="font-semibold">{{ results.breakdown.agree }}</span>
								</div>
								<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
									<div
										class="progress-bar bg-green-500 h-2 rounded-full"
										:style="{ width: `${(results.breakdown.agree / responseCount) * 100}%` }"
									></div>
								</div>
							</div>
						</div>

						<div class="flex items-center gap-3">
							<span class="text-2xl">🤷</span>
							<div class="flex-1">
								<div class="flex justify-between mb-1">
									<span>Neutral</span>
									<span class="font-semibold">{{ results.breakdown.neutral }}</span>
								</div>
								<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
									<div
										class="progress-bar bg-gray-500 h-2 rounded-full"
										:style="{ width: `${(results.breakdown.neutral / responseCount) * 100}%` }"
									></div>
								</div>
							</div>
						</div>

						<div class="flex items-center gap-3">
							<span class="text-2xl">❌</span>
							<div class="flex-1">
								<div class="flex justify-between mb-1">
									<span>Disagree</span>
									<span class="font-semibold">{{ results.breakdown.disagree }}</span>
								</div>
								<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
									<div
										class="progress-bar bg-red-500 h-2 rounded-full"
										:style="{ width: `${(results.breakdown.disagree / responseCount) * 100}%` }"
									></div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Top Debaters -->
				<div v-if="results.topDebaters && results.topDebaters.length > 0">
					<h4 class="font-semibold mb-3">🔥 Top Debaters</h4>
					<div class="space-y-2">
						<div
							v-for="(username, index) in results.topDebaters"
							:key="username"
							class="flex items-center gap-2"
						>
							<span class="text-lg">{{ ['🥇', '🥈', '🥉'][index] || '•' }}</span>
							<span>{{ username }}</span>
						</div>
					</div>
				</div>

				<!-- All Responses -->
				<div v-if="currentGame.status === 'completed' && results.responses.length > 0">
					<h4 class="font-semibold mb-3">All Responses</h4>
					<div class="space-y-3">
						<div
							v-for="response in results.responses"
							:key="response.userId"
							class="border-l-4 pl-3"
							:class="{
								'border-green-500': response.stance === 'agree',
								'border-gray-500': response.stance === 'neutral',
								'border-red-500': response.stance === 'disagree'
							}"
						>
							<div class="flex items-center gap-2 mb-1">
								<span class="font-semibold">{{ response.username }}</span>
								<span>{{ response.stance === 'agree' ? 'agrees' : response.stance === 'disagree' ? 'disagrees' : 'is neutral' }}</span>
							</div>
							<p v-if="response.reasoning" class="text-sm text-gray-400 italic">
								"{{ response.reasoning }}"
							</p>
						</div>
					</div>
				</div>
			</div>
		</template>
	</GamesGameLayout>
</template>
