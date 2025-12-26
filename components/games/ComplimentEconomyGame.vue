<script setup lang="ts">
import type { ComplimentEconomyPrompt } from '~/composables/games/useComplimentEconomy';
import { getGameMetadata } from '~/types/games';

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
	submitCompliments,
	getResults,
	completeGame,
} = useComplimentEconomy(props.groupId);

const { isAdmin, members } = useGroupMembers(computed(() => props.groupId));
const supabase = useSupabaseClient();
const user = useSupabaseUser();

const gameMetadata = getGameMetadata('compliment_economy');

// Compliment form state
const compliments = ref<Array<{
	recipientUserId: string;
	coins: number;
	reason: string;
}>>([]);

const results = ref<any>(null);
const responseCount = ref(0);

// Load active game
const loadActiveGame = async () => {
	const game = await getActiveGame();
	if (game) {
		await getUserResponse(game.id);

		// Load results if completed
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

// Get available coins
const coinsPerPlayer = computed(() => {
	if (!currentGame.value) return 5;
	const prompt = currentGame.value.prompt as ComplimentEconomyPrompt;
	return prompt.coinsPerPlayer || 5;
});

// Calculate remaining coins
const coinsUsed = computed(() => {
	return compliments.value.reduce((sum, c) => sum + c.coins, 0);
});

const coinsRemaining = computed(() => {
	return coinsPerPlayer.value - coinsUsed.value;
});

// Add compliment
const addCompliment = () => {
	compliments.value.push({
		recipientUserId: '',
		coins: 1,
		reason: '',
	});
};

// Remove compliment
const removeCompliment = (index: number) => {
	compliments.value.splice(index, 1);
};

// Filter members (exclude current user)
const availableMembers = computed(() => {
	return members.value.filter(m => m.user_id !== user.value?.id);
});

// Submit compliments
const handleSubmitCompliments = async () => {
	if (!currentGame.value) return;

	// Validate all compliments have recipient, coins, and reason
	const validCompliments = compliments.value.filter(
		c => c.recipientUserId && c.coins > 0 && c.reason.trim()
	);

	if (validCompliments.length === 0) return;

	const result = await submitCompliments(currentGame.value.id, {
		compliments: validCompliments,
	});

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

// Check if form is valid
const isFormValid = computed(() => {
	return compliments.value.length > 0 &&
		compliments.value.every(c => c.recipientUserId && c.coins > 0 && c.reason.trim()) &&
		coinsUsed.value <= coinsPerPlayer.value;
});
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
				<div class="text-center py-6 relative z-10">
					<div class="text-6xl mb-4">💝</div>

					<h3 class="text-xl font-semibold mb-2">
						The Compliment Economy
					</h3>
					<p class="text-sm text-gray-400 mb-3">
						You have {{ coinsPerPlayer }} compliment coins to award to your friends.
					</p>
					<p class="text-xs text-gray-500">
						Make appreciation intentional. Each compliment requires an explanation!
					</p>
				</div>
			</UCard>

			<!-- Submit Compliments -->
			<div v-if="!userResponse && currentGame.status === 'active'" class="space-y-4">
				<!-- Coins Remaining -->
				<div class="flex justify-between items-center p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
					<span class="font-semibold">Coins Remaining</span>
					<UBadge :color="coinsRemaining >= 0 ? 'rose' : 'red'" size="lg">
						{{ coinsRemaining }}/{{ coinsPerPlayer }}
					</UBadge>
				</div>

				<!-- Compliment List -->
				<div class="space-y-3">
					<div
						v-for="(compliment, index) in compliments"
						:key="index"
						class="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg space-y-3"
					>
						<div class="flex justify-between items-start">
							<span class="font-semibold text-sm">Compliment #{{ index + 1 }}</span>
							<UButton
								variant="ghost"
								color="red"
								size="xs"
								icon="i-heroicons-x-mark"
								@click="removeCompliment(index)"
							/>
						</div>

						<!-- Recipient Selection -->
						<UFormField label="Award To" required>
							<select
								v-model="compliment.recipientUserId"
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
							>
								<option value="">Select a person...</option>
								<option
									v-for="member in availableMembers"
									:key="member.user_id"
									:value="member.user_id"
								>
									{{ member.username }}
								</option>
							</select>
						</UFormField>

						<!-- Coins Amount -->
						<UFormField label="Coins" required>
							<select
								v-model.number="compliment.coins"
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
							>
								<option :value="1">1 coin</option>
								<option :value="2">2 coins</option>
								<option :value="3">3 coins</option>
								<option :value="4">4 coins</option>
								<option :value="5">5 coins</option>
							</select>
						</UFormField>

						<!-- Reason -->
						<UFormField label="Why do they deserve this?" required>
							<UTextarea
								v-model="compliment.reason"
								placeholder="Be specific about what they did or how they helped..."
								:rows="3"
							/>
						</UFormField>
					</div>
				</div>

				<!-- Add Another Button -->
				<UButton
					@click="addCompliment"
					variant="outline"
					block
					icon="i-heroicons-plus"
					:disabled="coinsRemaining <= 0"
				>
					Add Another Compliment
				</UButton>

				<!-- Submit Button -->
				<UButton
					@click="handleSubmitCompliments"
					:loading="loading"
					:disabled="!isFormValid || coinsRemaining < 0"
					block
					size="lg"
				>
					Submit Compliments
				</UButton>
			</div>

			<!-- Compliments Submitted -->
			<div v-if="userResponse">
				<UCard class="bg-blue-50 dark:bg-blue-900/20">
					<div class="text-center py-6">
						<div class="text-3xl mb-3">✅</div>
						<p class="font-semibold mb-2">Compliments Submitted!</p>
						<p class="text-sm text-gray-400">
							You awarded {{ userResponse.response_data.compliments.length }} {{ userResponse.response_data.compliments.length === 1 ? 'compliment' : 'compliments' }}
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
			<!-- Top Recipients -->
			<UCard v-if="results.topRecipients && results.topRecipients.length > 0" class="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-800/20">
				<div class="text-center py-4">
					<div class="text-3xl mb-3">🏆</div>
					<p class="text-lg font-semibold mb-3">Most Appreciated</p>
					<div class="space-y-2">
						<div
							v-for="(recipient, index) in results.topRecipients"
							:key="recipient.userId"
							class="flex items-center justify-center gap-3"
						>
							<span class="text-lg">{{ ['🥇', '🥈', '🥉'][index] }}</span>
							<UAvatar
								:src="recipient.avatarUrl"
								:alt="recipient.username"
								size="sm"
							/>
							<span class="font-semibold">{{ recipient.username }}</span>
							<UBadge color="rose">{{ recipient.totalCoins }} coins</UBadge>
						</div>
					</div>
				</div>
			</UCard>

			<!-- All Compliments -->
			<div v-if="results.compliments && results.compliments.length > 0">
				<h4 class="font-semibold mb-4">All Compliments</h4>
				<div class="space-y-3">
					<div
						v-for="(compliment, index) in results.compliments"
						:key="index"
						class="border-l-4 border-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded-r-lg p-4"
					>
						<div class="flex items-start gap-3 mb-2">
							<UAvatar
								:src="compliment.giverAvatarUrl"
								:alt="compliment.giverUsername"
								size="sm"
							/>
							<div class="flex-1">
								<div class="flex items-center gap-2 mb-1">
									<span class="font-semibold text-sm">{{ compliment.giverUsername }}</span>
									<span class="text-gray-400 text-xs">gave</span>
									<UBadge color="rose" size="xs">{{ compliment.coins }} {{ compliment.coins === 1 ? 'coin' : 'coins' }}</UBadge>
									<span class="text-gray-400 text-xs">to</span>
									<span class="font-semibold text-sm">{{ compliment.recipientUsername }}</span>
								</div>
								<p class="text-sm text-gray-600 dark:text-gray-400 italic">
									"{{ compliment.reason }}"
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</template>
	</GamesGameLayout>
</template>
