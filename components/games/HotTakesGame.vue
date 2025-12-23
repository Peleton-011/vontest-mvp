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

const responseForm = reactive({
	stance: '' as 'agree' | 'disagree' | 'neutral' | '',
	reasoning: '',
});

const results = ref<any>(null);
const responseCount = ref(0);
const isAdmin = ref(true); // TODO: Check actual admin status

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

onMounted(loadActiveGame);
</script>

<template>
	<div class="space-y-6">
		<!-- Game Header -->
		<div class="flex items-start justify-between gap-4">
			<div class="flex items-start gap-4 flex-1">
				<div class="p-3 rounded-lg bg-red-100 dark:bg-red-900/20">
					<UIcon :name="gameMetadata.icon" class="w-8 h-8 text-red-600" />
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
			<UIcon name="i-heroicons-fire" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
			<p class="text-gray-600">Loading game...</p>
		</div>

		<!-- Active Game -->
		<div v-else class="space-y-6">
			<!-- Response Count Card (before user responds) -->
			<div v-if="!userResponse && currentGame.status === 'active'" class="text-center">
				<UCard class="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-800/20">
					<div class="py-6">
						<div class="text-4xl font-bold text-red-600 mb-2">
							{{ responseCount }}
						</div>
						<div class="text-lg font-semibold mb-1">
							{{ responseCount === 1 ? 'Response' : 'Responses' }}
						</div>
						<div class="text-sm text-gray-600">
							Share your stance to see how others voted!
						</div>
					</div>
				</UCard>
			</div>

			<!-- Game Prompt -->
			<UCard>
				<div class="text-center py-6">
					<div class="text-3xl mb-2">🔥</div>
					<p class="text-xl font-semibold">
						{{ (currentGame.prompt as HotTakesPrompt).statement }}
					</p>
				</div>
			</UCard>

			<!-- Response Form (if not already responded) -->
			<div v-if="!userResponse && currentGame.status === 'active'" class="space-y-4">
				<!-- Stance Selection -->
				<div class="grid grid-cols-3 gap-3">
					<UCard
						:class="[
							'cursor-pointer transition-all text-center p-4',
							responseForm.stance === 'agree' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' : 'hover:scale-105'
						]"
						@click="responseForm.stance = 'agree'"
					>
						<div class="text-3xl mb-2">✅</div>
						<div class="font-semibold">Agree</div>
					</UCard>

					<UCard
						:class="[
							'cursor-pointer transition-all text-center p-4',
							responseForm.stance === 'neutral' ? 'ring-2 ring-gray-500 bg-gray-50 dark:bg-gray-900/20' : 'hover:scale-105'
						]"
						@click="responseForm.stance = 'neutral'"
					>
						<div class="text-3xl mb-2">🤷</div>
						<div class="font-semibold">Neutral</div>
					</UCard>

					<UCard
						:class="[
							'cursor-pointer transition-all text-center p-4',
							responseForm.stance === 'disagree' ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' : 'hover:scale-105'
						]"
						@click="responseForm.stance = 'disagree'"
					>
						<div class="text-3xl mb-2">❌</div>
						<div class="font-semibold">Disagree</div>
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

			<!-- User's Response (after responding) -->
			<div v-if="userResponse" class="space-y-4">
				<UCard class="bg-blue-50 dark:bg-blue-900/20">
					<div class="flex items-center gap-3">
						<div class="text-2xl">
							{{ userResponse.stance === 'agree' ? '✅' : userResponse.stance === 'disagree' ? '❌' : '🤷' }}
						</div>
						<div class="flex-1">
							<p class="font-semibold">
								You {{ userResponse.stance === 'agree' ? 'agreed' : userResponse.stance === 'disagree' ? 'disagreed' : 'stayed neutral' }}
							</p>
							<p v-if="userResponse.reasoning" class="text-sm text-gray-600 mt-1">
								"{{ userResponse.reasoning }}"
							</p>
						</div>
					</div>
				</UCard>

				<!-- Results -->
				<div v-if="results" class="space-y-4">
					<!-- Vote Breakdown -->
					<UCard>
						<h3 class="font-semibold mb-4">Results</h3>
						<div class="space-y-3">
							<div class="flex items-center gap-3">
								<span class="text-2xl">✅</span>
								<div class="flex-1">
									<div class="flex justify-between mb-1">
										<span>Agree</span>
										<span class="font-semibold">{{ results.breakdown.agree }}</span>
									</div>
									<div class="w-full bg-gray-200 rounded-full h-2">
										<div
											class="bg-green-500 h-2 rounded-full"
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
									<div class="w-full bg-gray-200 rounded-full h-2">
										<div
											class="bg-gray-500 h-2 rounded-full"
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
									<div class="w-full bg-gray-200 rounded-full h-2">
										<div
											class="bg-red-500 h-2 rounded-full"
											:style="{ width: `${(results.breakdown.disagree / responseCount) * 100}%` }"
										></div>
									</div>
								</div>
							</div>
						</div>
					</UCard>

					<!-- Top Debaters -->
					<UCard v-if="results.topDebaters && results.topDebaters.length > 0">
						<h3 class="font-semibold mb-3">🔥 Top Debaters</h3>
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
					</UCard>

					<!-- Who Said What -->
					<UCard>
						<h3 class="font-semibold mb-3">Who Said What</h3>
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
								<p v-if="response.reasoning" class="text-sm text-gray-600 italic">
									"{{ response.reasoning }}"
								</p>
							</div>
						</div>
					</UCard>
				</div>
			</div>

			<!-- Admin Controls -->
			<div v-if="isAdmin && currentGame.status === 'active'" class="pt-6 border-t">
				<UButton
					variant="outline"
					color="neutral"
					icon="i-heroicons-check-circle"
					@click="handleCompleteGame"
				>
					End Game & Post Results to Chat
				</UButton>
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
