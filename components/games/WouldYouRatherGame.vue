<script setup lang="ts">
import type { WouldYouRatherPrompt, WouldYouRatherResponse } from '~/composables/games/useWouldYouRather';

const props = defineProps<{
	groupId: string;
}>();

const {
	loading,
	error,
	currentGame,
	userResponse,
	createGame,
	submitResponse,
	getActiveGame,
	getUserResponse,
	getResults,
	completeGame,
} = useWouldYouRather(props.groupId);

// Form for creating new game
const newGameForm = reactive({
	option_a: '',
	option_b: '',
});

// Form for responding to game
const responseForm = reactive({
	choice: 'a' as 'a' | 'b',
	intensity: 5,
});

const showCreateForm = ref(false);
const results = ref<any>(null);

// Load active game on mount
onMounted(async () => {
	await loadActiveGame();
});

const loadActiveGame = async () => {
	const game = await getActiveGame();
	if (game) {
		await getUserResponse(game.id);
		// If game is completed, load results
		if (game.status === 'completed') {
			results.value = await getResults(game.id);
		}
	}
};

const handleCreateGame = async () => {
	if (!newGameForm.option_a.trim() || !newGameForm.option_b.trim()) {
		return;
	}

	const result = await createGame({
		option_a: newGameForm.option_a,
		option_b: newGameForm.option_b,
	});

	if (result.success) {
		newGameForm.option_a = '';
		newGameForm.option_b = '';
		showCreateForm.value = false;
		await loadActiveGame();
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
	<div class="would-you-rather-game">
		<!-- Error Display -->
		<div v-if="error" class="text-red-600 bg-red-50 p-3 rounded mb-4">
			{{ error }}
		</div>

		<!-- No Active Game -->
		<div v-if="!currentGame && !showCreateForm" class="text-center py-8">
			<UIcon name="i-heroicons-scale" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
			<h3 class="text-xl font-semibold mb-2">No Active Game</h3>
			<p class="text-gray-600 mb-4">Start a new Would You Rather game!</p>
			<UButton
				v-if="isAdmin"
				@click="showCreateForm = true"
				icon="i-heroicons-plus"
			>
				Create Game
			</UButton>
		</div>

		<!-- Create Game Form -->
		<div v-if="showCreateForm" class="space-y-4">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-semibold">Create Would You Rather Game</h3>
				<UButton
					variant="ghost"
					icon="i-heroicons-x-mark"
					@click="showCreateForm = false"
				/>
			</div>

			<UFormGroup label="Option A" required>
				<UInput
					v-model="newGameForm.option_a"
					placeholder="e.g., Have super strength"
					:disabled="loading"
				/>
			</UFormGroup>

			<UFormGroup label="Option B" required>
				<UInput
					v-model="newGameForm.option_b"
					placeholder="e.g., Have super speed"
					:disabled="loading"
				/>
			</UFormGroup>

			<div class="flex gap-2">
				<UButton
					@click="handleCreateGame"
					:loading="loading"
					:disabled="!newGameForm.option_a.trim() || !newGameForm.option_b.trim()"
				>
					Create Game
				</UButton>
				<UButton variant="outline" @click="showCreateForm = false">
					Cancel
				</UButton>
			</div>
		</div>

		<!-- Active Game -->
		<div v-if="currentGame && !showCreateForm" class="space-y-6">
			<div>
				<h3 class="text-xl font-bold mb-4">Would You Rather...</h3>

				<!-- Game Prompt -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
					<!-- Option A -->
					<UCard
						:class="[
							'cursor-pointer transition-all',
							responseForm.choice === 'a' ? 'ring-2 ring-blue-500' : '',
							userResponse?.choice === 'a' ? 'bg-blue-50 dark:bg-blue-900/20' : ''
						]"
						@click="!userResponse ? responseForm.choice = 'a' : null"
					>
						<div class="text-center p-4">
							<div class="text-4xl mb-2">A</div>
							<div class="font-semibold">{{ (currentGame.prompt as WouldYouRatherPrompt).option_a }}</div>
							<div v-if="userResponse?.choice === 'a'" class="text-blue-600 mt-2">
								✓ Your Choice (Intensity: {{ userResponse.intensity }}/10)
							</div>
						</div>
					</UCard>

					<!-- Option B -->
					<UCard
						:class="[
							'cursor-pointer transition-all',
							responseForm.choice === 'b' ? 'ring-2 ring-purple-500' : '',
							userResponse?.choice === 'b' ? 'bg-purple-50 dark:bg-purple-900/20' : ''
						]"
						@click="!userResponse ? responseForm.choice = 'b' : null"
					>
						<div class="text-center p-4">
							<div class="text-4xl mb-2">B</div>
							<div class="font-semibold">{{ (currentGame.prompt as WouldYouRatherPrompt).option_b }}</div>
							<div v-if="userResponse?.choice === 'b'" class="text-purple-600 mt-2">
								✓ Your Choice (Intensity: {{ userResponse.intensity }}/10)
							</div>
						</div>
					</UCard>
				</div>

				<!-- Response Form (if not already responded) -->
				<div v-if="!userResponse && currentGame.status === 'active'" class="space-y-4">
					<UFormGroup label="How strongly do you feel about this choice? (1-10)">
						<div class="flex items-center gap-4">
							<input
								v-model="responseForm.intensity"
								type="range"
								min="1"
								max="10"
								class="flex-1"
							/>
							<span class="font-semibold w-8 text-center">{{ responseForm.intensity }}</span>
						</div>
					</UFormGroup>

					<UButton
						@click="handleSubmitResponse"
						:loading="loading"
						block
					>
						Submit Response
					</UButton>
				</div>

				<!-- Admin Controls -->
				<div v-if="isAdmin && currentGame.status === 'active'" class="mt-6 pt-6 border-t">
					<UButton
						@click="handleCompleteGame"
						variant="outline"
						color="green"
					>
						End Game & Show Results
					</UButton>
				</div>

				<!-- Results (if completed) -->
				<div v-if="currentGame.status === 'completed' && results" class="mt-6 pt-6 border-t">
					<h4 class="text-lg font-semibold mb-4">Results</h4>
					<div class="space-y-4">
						<div>
							<div class="flex justify-between items-center mb-2">
								<span class="font-semibold">Option A</span>
								<span>{{ results.votes.option_a }} votes (avg: {{ results.avg_intensity_a.toFixed(1) }}/10)</span>
							</div>
							<div class="w-full bg-gray-200 rounded-full h-4">
								<div
									class="bg-blue-500 h-4 rounded-full transition-all"
									:style="{
										width: `${(results.votes.option_a / (results.votes.option_a + results.votes.option_b) * 100) || 0}%`
									}"
								></div>
							</div>
						</div>

						<div>
							<div class="flex justify-between items-center mb-2">
								<span class="font-semibold">Option B</span>
								<span>{{ results.votes.option_b }} votes (avg: {{ results.avg_intensity_b.toFixed(1) }}/10)</span>
							</div>
							<div class="w-full bg-gray-200 rounded-full h-4">
								<div
									class="bg-purple-500 h-4 rounded-full transition-all"
									:style="{
										width: `${(results.votes.option_b / (results.votes.option_a + results.votes.option_b) * 100) || 0}%`
									}"
								></div>
							</div>
						</div>
					</div>

					<div class="mt-4 text-sm text-gray-600">
						Results have been posted to the group chat!
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
