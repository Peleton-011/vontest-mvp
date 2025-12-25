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
	<div class="space-y-6">
		<!-- Game Header -->
		<div class="flex items-start justify-between gap-4">
			<div class="flex items-start gap-4 flex-1">
				<div class="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/20">
					<UIcon :name="gameMetadata.icon" class="w-8 h-8 text-blue-600" />
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
			<UIcon name="i-heroicons-users" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
			<p class="text-gray-600">Loading game...</p>
		</div>

		<!-- Active Game -->
		<div v-else class="space-y-6">
			<!-- Response Count Card (before user votes) -->
			<div v-if="!userResponse && currentGame.status === 'active'" class="text-center">
				<UCard class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-800/20">
					<div class="py-6">
						<div class="text-4xl font-bold text-blue-600 mb-2">
							{{ responseCount }}
						</div>
						<div class="text-lg font-semibold mb-1">
							{{ responseCount === 1 ? 'Vote' : 'Votes' }}
						</div>
						<div class="text-sm text-gray-600">
							Cast your vote to see the results!
						</div>
					</div>
				</UCard>
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
					<p class="text-sm text-gray-600">
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

			<!-- User's Vote (after voting) -->
			<div v-if="userResponse" class="space-y-4">
				<UCard class="bg-blue-50 dark:bg-blue-900/20">
					<div class="text-center py-4">
						<div class="text-2xl mb-2">✅</div>
						<p class="font-semibold">You voted for:</p>
						<p class="text-lg text-blue-600 mt-1">
							{{ groupMembers.find(m => m.userId === userResponse.votedUserId)?.username || 'Someone' }}
						</p>
					</div>
				</UCard>

				<!-- Results -->
				<div v-if="results" class="space-y-4">
					<!-- Winner -->
					<UCard v-if="results.winner" class="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-800/20">
						<div class="text-center py-6">
							<div class="text-4xl mb-3">🏆</div>
							<p class="text-lg font-semibold mb-1">Winner</p>
							<p class="text-2xl font-bold text-yellow-600">{{ results.winner.username }}</p>
							<p class="text-sm text-gray-600 mt-1">
								{{ results.winner.votes }} {{ results.winner.votes === 1 ? 'vote' : 'votes' }}
							</p>
						</div>
					</UCard>

					<!-- Top 3 -->
					<UCard v-if="results.topThree.length > 0">
						<h3 class="text-lg font-semibold mb-4">Top 3</h3>
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
									<span class="text-sm text-gray-600">{{ person.votes }} votes</span>
									<div class="w-24 bg-gray-200 rounded-full h-2">
										<div
											class="bg-blue-500 h-2 rounded-full"
											:style="{ width: `${(person.votes / responseCount) * 100}%` }"
										></div>
									</div>
								</div>
							</div>
						</div>
					</UCard>

					<!-- All Votes -->
					<UCard>
						<h3 class="font-semibold mb-4">All Votes</h3>
						<div class="space-y-2">
							<div
								v-for="response in results.responses"
								:key="`${response.voterUserId}-${response.votedUserId}`"
								class="flex items-center gap-2 text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded"
							>
								<span class="text-gray-600">{{ response.voterUsername }}</span>
								<span class="text-gray-400">→</span>
								<span class="font-semibold">{{ response.votedUsername }}</span>
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
