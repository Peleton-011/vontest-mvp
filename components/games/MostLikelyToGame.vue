<script setup lang="ts">
import { GAME_TYPES, type GameType } from '~/types/games';
import type { MostLikelyToPrompt } from '~/composables/games/useMostLikelyTo';

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
	submitVote,
	getResults,
	completeGame,
} = useMostLikelyTo(props.groupId);

const { isAdmin } = useGroupMembers(computed(() => props.groupId));
const supabase = useSupabaseClient();

const selectedUserId = ref('');
const results = ref<any>(null);
const responseCount = ref(0);
const groupMembers = ref<any[]>([]);

const gameMetadata = computed(() => GAME_TYPES['most_likely_to']);

// Load group members for voting
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

// Load active game and user response
const loadActiveGame = async () => {
	const game = await getActiveGame();
	if (game) {
		await getUserResponse(game.id);
		await loadGroupMembers();

		// Get results
		const gameResults = await getResults(game.id);
		if (gameResults) {
			responseCount.value = gameResults.responses.length;

			// Only show full results if user has voted or game is completed
			if (userResponse.value || game.status === 'completed') {
				results.value = gameResults;
			}
		}
	}
};

// Submit vote
const handleSubmitVote = async () => {
	if (!currentGame.value || !selectedUserId.value) return;

	const result = await submitVote(currentGame.value.id, selectedUserId.value);

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

onMounted(async () => {
	await loadActiveGame();

	// Subscribe to game instance changes for automatic completion
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
					// Reload game when status changes
					if (payload.new.status !== currentGame.value?.status) {
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
	<div class="most-likely-to-game space-y-8">
		<!-- Error Display -->
		<div v-if="error" class="text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded">
			{{ error }}
		</div>

		<!-- No Active Game -->
		<div v-if="!currentGame" class="text-center py-12">
			<UIcon name="i-heroicons-users" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
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

				<!-- Game Prompt -->
				<UCard class="overflow-hidden relative">
					<!-- Background Image (if provided) -->
					<div
						v-if="(currentGame.prompt as MostLikelyToPrompt).visual?.type === 'image'"
						class="absolute inset-0 bg-cover bg-center opacity-20"
						:style="{
							backgroundImage: `url(${(currentGame.prompt as MostLikelyToPrompt).visual?.value})`
						}"
					></div>

					<div class="text-center py-6 relative z-10">
						<!-- Custom Emoji Visual (if provided) -->
						<div v-if="(currentGame.prompt as MostLikelyToPrompt).visual?.type === 'emoji'" class="text-6xl mb-4">
							{{ (currentGame.prompt as MostLikelyToPrompt).visual?.value }}
						</div>
						<!-- Default Emoji (if no visual) -->
						<div v-else class="text-3xl mb-2">👤</div>

						<p class="text-xl font-semibold">
							{{ (currentGame.prompt as MostLikelyToPrompt).scenario }}
						</p>
					</div>
				</UCard>

				<!-- Voting Form (if not already voted) -->
				<div v-if="!userResponse && currentGame.status === 'active'" class="space-y-4">
					<div class="text-center mb-4">
						<p class="text-sm text-gray-400">
							Select who you think fits this scenario best
						</p>
					</div>

					<!-- Member Selection Grid -->
					<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
						<UCard
							v-for="member in groupMembers"
							:key="member.userId"
							:class="[
								'cursor-pointer transition-all text-center p-4',
								selectedUserId === member.userId ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:scale-105'
							]"
							@click="selectedUserId = member.userId"
						>
							<div class="flex flex-col items-center gap-2">
								<div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
									{{ member.username.charAt(0).toUpperCase() }}
								</div>
								<span class="font-semibold text-sm">{{ member.username }}</span>
							</div>
						</UCard>
					</div>

					<UButton
						@click="handleSubmitVote"
						:loading="loading"
						:disabled="!selectedUserId"
						block
						size="lg"
					>
						Submit Vote
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
				<UCard class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-800/20">
					<div class="text-center py-6">
						<div class="text-4xl font-bold text-blue-600 mb-2">
							{{ responseCount }}
						</div>
						<div class="text-lg font-semibold mb-1">
							{{ responseCount === 1 ? 'Vote' : 'Votes' }} Submitted
						</div>
						<div v-if="!userResponse && currentGame.status === 'active'" class="text-sm text-gray-400">
							Submit your choice to see detailed results!
						</div>
					</div>
				</UCard>

				<!-- Detailed Results (shown after user responds or game is completed) -->
				<div v-if="results && (userResponse || currentGame.status === 'completed')">
					<!-- User's Vote -->
					<UCard class="bg-blue-50 dark:bg-blue-900/20">
						<div class="text-center py-4">
							<div class="text-2xl mb-2">✅</div>
							<p class="font-semibold">You voted for:</p>
							<p class="text-lg text-blue-600 mt-1">
								{{ groupMembers.find(m => m.userId === userResponse.votedUserId)?.username || 'Someone' }}
							</p>
						</div>
					</UCard>

					<!-- Winner -->
					<UCard v-if="results.winner" class="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-800/20">
						<div class="text-center py-6">
							<div class="text-4xl mb-3">🏆</div>
							<p class="text-lg font-semibold mb-1">Winner</p>
							<p class="text-2xl font-bold text-yellow-600">{{ results.winner.username }}</p>
							<p class="text-sm text-gray-400 mt-1">
								{{ results.winner.votes }} {{ results.winner.votes === 1 ? 'vote' : 'votes' }}
							</p>
						</div>
					</UCard>

					<!-- Top 3 -->
					<div v-if="results.topThree.length > 0">
						<h4 class="font-semibold mb-4">Top 3</h4>
						<div class="space-y-3">
							<div
								v-for="(person, index) in results.topThree"
								:key="person.userId"
								class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded"
							>
								<div class="flex items-center gap-3">
									<span class="text-2xl">{{ ['🥇', '🥈', '🥉'][index] || '•' }}</span>
									<span class="font-semibold">{{ person.username }}</span>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-sm text-gray-400">{{ person.votes }} votes</span>
									<div class="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
										<div
											class="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-out"
											:style="{ width: `${(person.votes / responseCount) * 100}%` }"
										></div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- All Responses -->
					<div v-if="currentGame.status === 'completed' && results.responses.length > 0">
						<h4 class="font-semibold mb-4">All Votes</h4>
						<div class="space-y-2">
							<div
								v-for="response in results.responses"
								:key="`${response.voterUserId}-${response.votedUserId}`"
								class="flex items-center gap-2 text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded"
							>
								<span class="text-gray-400">{{ response.voterUsername }}</span>
								<span class="text-gray-400">→</span>
								<span class="font-semibold">{{ response.votedUsername }}</span>
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
