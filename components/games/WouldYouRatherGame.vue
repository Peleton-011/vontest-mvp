<script setup lang="ts">
import type { WouldYouRatherPrompt, WouldYouRatherResponse, WouldYouRatherResults } from '~/composables/games/useWouldYouRather';
import { getGameMetadata } from '~/types/games';

const props = defineProps<{
	groupId: string;
}>();

const {
	loading,
	error,
	currentGame,
	userResponse,
	submitResponse,
	getActiveGame,
	getUserResponse,
	getResults,
	completeGame,
} = useWouldYouRather(props.groupId);

const gameMetadata = getGameMetadata('would_you_rather');

// Form for responding to game
const responseForm = reactive({
	choice: 'a' as 'a' | 'b',
	intensity: 5,
});

const results = ref<WouldYouRatherResults | null>(null);
const responseCount = ref(0);

// Load active game on mount
onMounted(async () => {
	await loadActiveGame();
});

const loadActiveGame = async () => {
	const game = await getActiveGame();
	if (game) {
		await getUserResponse(game.id);

		// Load results to get response count
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

const handleSubmitResponse = async () => {
	if (!currentGame.value) return;

	const result = await submitResponse(currentGame.value.id, {
		choice: responseForm.choice,
		intensity: responseForm.intensity,
	});

	if (result.success) {
		await getUserResponse(currentGame.value.id);
		// Now load and show results
		results.value = await getResults(currentGame.value.id);
	}
};

const handleCompleteGame = async () => {
	if (!currentGame.value) return;

	const result = await completeGame(currentGame.value.id);
	if (result.success) {
		await loadActiveGame();
	}
};

const isAdmin = ref(true); // TODO: Check actual admin status
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
			<!-- Game Prompt Cards -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
				<!-- Option A -->
				<UCard
					:class="[
						'cursor-pointer transition-all overflow-hidden relative touch-manipulation active:scale-95 md:active:scale-100',
						!userResponse ? 'md:hover:scale-105' : '',
						responseForm.choice === 'a' && !userResponse ? 'ring-2 ring-blue-500' : '',
						userResponse?.choice === 'a' ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' : ''
					]"
					@click="!userResponse ? responseForm.choice = 'a' : null"
				>
					<!-- Background Image (if provided) -->
					<div
						v-if="(currentGame.prompt as WouldYouRatherPrompt).option_a_visual?.type === 'image'"
						class="absolute inset-0 bg-cover bg-center opacity-30"
						:style="{
							backgroundImage: `url(${(currentGame.prompt as WouldYouRatherPrompt).option_a_visual?.value})`
						}"
					></div>

					<div class="text-center p-4 md:p-6 relative z-10">
						<!-- Emoji Visual (if provided) -->
						<div
							v-if="(currentGame.prompt as WouldYouRatherPrompt).option_a_visual?.type === 'emoji'"
							class="text-6xl mb-4"
						>
							{{ (currentGame.prompt as WouldYouRatherPrompt).option_a_visual?.value }}
						</div>

						<div class="text-3xl md:text-4xl font-bold text-blue-600 mb-2 md:mb-3">A</div>
						<div class="text-base md:text-lg font-semibold">{{ (currentGame.prompt as WouldYouRatherPrompt).option_a }}</div>
						<div v-if="userResponse?.choice === 'a'" class="text-sm md:text-base text-blue-600 mt-2 md:mt-3 font-semibold">
							✓ Your Choice (Intensity: {{ userResponse.intensity }}/10)
						</div>
					</div>
				</UCard>

				<!-- Option B -->
				<UCard
					:class="[
						'cursor-pointer transition-all overflow-hidden relative touch-manipulation active:scale-95 md:active:scale-100',
						!userResponse ? 'md:hover:scale-105' : '',
						responseForm.choice === 'b' && !userResponse ? 'ring-2 ring-purple-500' : '',
						userResponse?.choice === 'b' ? 'bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500' : ''
					]"
					@click="!userResponse ? responseForm.choice = 'b' : null"
				>
					<!-- Background Image (if provided) -->
					<div
						v-if="(currentGame.prompt as WouldYouRatherPrompt).option_b_visual?.type === 'image'"
						class="absolute inset-0 bg-cover bg-center opacity-30"
						:style="{
							backgroundImage: `url(${(currentGame.prompt as WouldYouRatherPrompt).option_b_visual?.value})`
						}"
					></div>

					<div class="text-center p-4 md:p-6 relative z-10">
						<!-- Emoji Visual (if provided) -->
						<div
							v-if="(currentGame.prompt as WouldYouRatherPrompt).option_b_visual?.type === 'emoji'"
							class="text-6xl mb-4"
						>
							{{ (currentGame.prompt as WouldYouRatherPrompt).option_b_visual?.value }}
						</div>

						<div class="text-3xl md:text-4xl font-bold text-purple-600 mb-2 md:mb-3">B</div>
						<div class="text-base md:text-lg font-semibold">{{ (currentGame.prompt as WouldYouRatherPrompt).option_b }}</div>
						<div v-if="userResponse?.choice === 'b'" class="text-sm md:text-base text-purple-600 mt-2 md:mt-3 font-semibold">
							✓ Your Choice (Intensity: {{ userResponse.intensity }}/10)
						</div>
					</div>
				</UCard>
			</div>

			<!-- Response Form (if not already responded) -->
			<div v-if="!userResponse && currentGame.status === 'active'" class="space-y-4">
				<UFormField label="How strongly do you feel about this choice?">
					<div class="flex items-center gap-4">
						<span class="text-sm text-gray-400 w-12">Weak</span>
						<input
							v-model="responseForm.intensity"
							type="range"
							min="1"
							max="10"
							class="flex-1"
						>
						<span class="text-sm text-gray-400 w-12">Strong</span>
						<div class="w-12 text-center">
							<span class="font-bold text-lg">{{ responseForm.intensity }}</span>
							<span class="text-xs text-gray-500">/10</span>
						</div>
					</div>
				</UFormField>

				<UButton
					:loading="loading"
					block
					size="lg"
					@click="handleSubmitResponse"
				>
					Submit Response
				</UButton>
			</div>
		</template>

		<!-- Results Slot -->
		<template #results>
			<!-- Vote Distribution -->
			<div class="space-y-6">
				<div>
					<h4 class="font-semibold mb-4">Vote Distribution</h4>
					<div class="space-y-4">
						<!-- Option A Bar -->
						<div>
							<div class="flex justify-between items-center mb-2">
								<span class="font-semibold">Option A</span>
								<span class="text-sm text-gray-400">
									{{ results.votes.option_a }} votes • avg {{ results.avg_intensity_a.toFixed(1) }}/10
								</span>
							</div>
							<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
								<div
									class="progress-bar bg-blue-500 h-4 rounded-full flex items-center justify-end pr-2"
									:style="{
										width: `${(results.votes.option_a / (results.votes.option_a + results.votes.option_b) * 100) || 0}%`
									}"
								>
									<span v-if="results.votes.option_a > 0" class="text-xs text-white font-bold">
										{{ Math.round((results.votes.option_a / (results.votes.option_a + results.votes.option_b) * 100)) }}%
									</span>
								</div>
							</div>
						</div>

						<!-- Option B Bar -->
						<div>
							<div class="flex justify-between items-center mb-2">
								<span class="font-semibold">Option B</span>
								<span class="text-sm text-gray-400">
									{{ results.votes.option_b }} votes • avg {{ results.avg_intensity_b.toFixed(1) }}/10
								</span>
							</div>
							<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
								<div
									class="progress-bar bg-purple-500 h-4 rounded-full flex items-center justify-end pr-2"
									:style="{
										width: `${(results.votes.option_b / (results.votes.option_a + results.votes.option_b) * 100) || 0}%`
									}"
								>
									<span v-if="results.votes.option_b > 0" class="text-xs text-white font-bold">
										{{ Math.round((results.votes.option_b / (results.votes.option_a + results.votes.option_b) * 100)) }}%
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Individual Responses -->
				<div v-if="currentGame.status === 'completed' && results.responses.length > 0">
					<h4 class="font-semibold mb-4">All Responses</h4>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div
							v-for="response in results.responses"
							:key="response.user_id"
							class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
						>
							<div class="flex items-start justify-between gap-2">
								<div class="flex items-center gap-2">
									<UAvatar
										:src="response.user_avatar"
										:alt="response.user_name"
										size="sm"
									/>
									<span class="font-medium text-sm">{{ response.user_name }}</span>
								</div>
								<div class="flex items-center gap-2">
									<span
										:class="[
											'text-lg font-bold',
											response.choice === 'a' ? 'text-blue-600' : 'text-purple-600'
										]"
									>
										{{ response.choice.toUpperCase() }}
									</span>
									<span class="text-xs text-gray-400">
										{{ response.intensity }}/10
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</template>
	</GamesGameLayout>
</template>
