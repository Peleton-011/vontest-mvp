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
</script>

<template>
	<div class="would-you-rather-game space-y-8">
		<!-- Error Display -->
		<div v-if="error" class="text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded">
			{{ error }}
		</div>

		<!-- No Active Game -->
		<div v-if="!currentGame" class="text-center py-12">
			<UIcon name="i-heroicons-puzzle-piece" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
			<p class="text-gray-400">Loading game...</p>
		</div>

		<!-- Active Game -->
		<div v-else class="space-y-8">
			<!-- SECTION 1: Current Game -->
			<div class="space-y-6">
				<!-- Game Header -->
				<div class="flex items-start justify-between gap-4">
					<div class="flex items-start gap-4">
						<div
							:class="[
								'p-3 rounded-lg',
								`bg-${gameMetadata.color}-100 dark:bg-${gameMetadata.color}-900/20`,
							]"
						>
							<UIcon
								:name="gameMetadata.icon"
								:class="['w-6 h-6', `text-${gameMetadata.color}-600`]"
							/>
						</div>
						<div>
							<h2 class="text-2xl font-bold">{{ gameMetadata.name }}</h2>
							<p class="text-sm text-gray-400 mt-1">
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

				<!-- Game Prompt Cards -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<!-- Option A -->
					<UCard
						:class="[
							'cursor-pointer transition-all overflow-hidden relative',
							!userResponse ? 'hover:scale-105' : '',
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

						<div class="text-center p-4 relative z-10">
							<!-- Emoji Visual (if provided) -->
							<div
								v-if="(currentGame.prompt as WouldYouRatherPrompt).option_a_visual?.type === 'emoji'"
								class="text-6xl mb-4"
							>
								{{ (currentGame.prompt as WouldYouRatherPrompt).option_a_visual?.value }}
							</div>

							<div class="text-4xl font-bold text-blue-600 mb-3">A</div>
							<div class="text-lg font-semibold">{{ (currentGame.prompt as WouldYouRatherPrompt).option_a }}</div>
							<div v-if="userResponse?.choice === 'a'" class="text-blue-600 mt-3 font-semibold">
								✓ Your Choice (Intensity: {{ userResponse.intensity }}/10)
							</div>
						</div>
					</UCard>

					<!-- Option B -->
					<UCard
						:class="[
							'cursor-pointer transition-all overflow-hidden relative',
							!userResponse ? 'hover:scale-105' : '',
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

						<div class="text-center p-4 relative z-10">
							<!-- Emoji Visual (if provided) -->
							<div
								v-if="(currentGame.prompt as WouldYouRatherPrompt).option_b_visual?.type === 'emoji'"
								class="text-6xl mb-4"
							>
								{{ (currentGame.prompt as WouldYouRatherPrompt).option_b_visual?.value }}
							</div>

							<div class="text-4xl font-bold text-purple-600 mb-3">B</div>
							<div class="text-lg font-semibold">{{ (currentGame.prompt as WouldYouRatherPrompt).option_b }}</div>
							<div v-if="userResponse?.choice === 'b'" class="text-purple-600 mt-3 font-semibold">
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
			</div>

			<!-- Divider -->
			<div class="border-t border-gray-200 dark:border-gray-700"></div>

			<!-- SECTION 2: Results & Stats -->
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<h3 class="text-xl font-bold">Results</h3>
					<div v-if="isAdmin && currentGame.status === 'active'" class="flex gap-2">
						<UButton
							variant="outline"
							size="sm"
							icon="i-heroicons-check-circle"
							:loading="loading"
							@click="handleCompleteGame"
						>
							End Game & Publish Results
						</UButton>
					</div>
				</div>

				<!-- Response Count Card (always visible) -->
				<UCard class="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20">
					<div class="text-center py-6">
						<div class="text-4xl font-bold text-primary-600 mb-2">
							{{ responseCount }}
						</div>
						<div class="text-lg font-semibold mb-1">
							{{ responseCount === 1 ? 'Response' : 'Responses' }} Submitted
						</div>
						<div v-if="!userResponse && currentGame.status === 'active'" class="text-sm text-gray-400">
							Submit your choice to see detailed results!
						</div>
					</div>
				</UCard>

				<!-- Detailed Results (shown after user responds or game is completed) -->
				<div v-if="results && (userResponse || currentGame.status === 'completed')">
					<!-- Vote Summary -->
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
											class="bg-blue-500 h-4 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
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
											class="bg-purple-500 h-4 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
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
				</div>

				<!-- Waiting for results message -->
				<div v-else class="text-center py-8">
					<UIcon name="i-heroicons-lock-closed" class="w-12 h-12 mx-auto text-gray-400 mb-3" />
					<p class="text-gray-400">
						{{ userResponse ? 'Waiting for game to end to see detailed results' : 'Submit your response to see results' }}
					</p>
				</div>
			</div>
		</div>
	</div>
</template>
