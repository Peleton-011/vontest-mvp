<script setup lang="ts">
import { GAME_TYPES } from '~/types/games';
import type {
	CustomPromptData,
	WouldYouRatherData,
	HotTakesData,
	GuessWhoSaidItData,
	MostLikelyToData,
} from '~/composables/games/useCustomPrompts';

const props = defineProps<{
	groupId: string;
}>();

const open = ref(false);

const {
	loading,
	error,
	prompts,
	stats,
	createPrompt,
	deletePrompt,
	fetchPrompts,
	fetchStats,
	getPromptDisplayText,
} = useCustomPrompts(props.groupId);

// Tabs
const activeTab = ref(0);
const tabs = [
	{
		slot: 'create',
		value: 0,
		label: 'Create Custom Prompt',
		icon: 'i-heroicons-plus-circle'
	},
	{
		slot: 'view',
		value: 1,
		label: 'Your Custom Prompts',
		icon: 'i-heroicons-queue-list'
	},
];

// Form state
const selectedGameType = ref<string>('would_you_rather');
const promptForm = reactive({
	// Would You Rather
	option_a: '',
	option_b: '',
	option_a_emoji: '',
	option_a_image: '',
	option_b_emoji: '',
	option_b_image: '',

	// Hot Takes
	statement: '',
	statement_emoji: '',
	statement_image: '',

	// Who Said It
	question: '',
	question_emoji: '',
	question_image: '',

	// Most Likely To
	scenario: '',
	scenario_emoji: '',
	scenario_image: '',

	// Tags
	tags: [] as string[],
});

// Game type options - dynamically generated from GAME_TYPES
const gameTypeOptions = Object.values(GAME_TYPES)
	.filter(game => !game.disabled) // Filter out disabled games
	.map(game => ({
		value: game.id,
		label: game.name,
		icon: game.icon,
		disabled: false
	}));

// Reset form
const resetForm = () => {
	Object.assign(promptForm, {
		option_a: '',
		option_b: '',
		option_a_emoji: '',
		option_a_image: '',
		option_b_emoji: '',
		option_b_image: '',
		statement: '',
		statement_emoji: '',
		statement_image: '',
		question: '',
		question_emoji: '',
		question_image: '',
		scenario: '',
		scenario_emoji: '',
		scenario_image: '',
		tags: [],
	});
};

// Create prompt
const handleCreatePrompt = async () => {
	let promptData: CustomPromptData;

	// Build prompt data based on game type
	switch (selectedGameType.value) {
		case 'would_you_rather':
			promptData = {
				option_a: promptForm.option_a,
				option_b: promptForm.option_b,
			} as WouldYouRatherData;

			// Add visuals if provided - can have both emoji and image
			if (promptForm.option_a_emoji || promptForm.option_a_image) {
				(promptData as WouldYouRatherData).option_a_visual = {} as any;
				if (promptForm.option_a_emoji) {
					(promptData as WouldYouRatherData).option_a_visual!.emoji = promptForm.option_a_emoji;
				}
				if (promptForm.option_a_image) {
					(promptData as WouldYouRatherData).option_a_visual!.image = promptForm.option_a_image;
				}
			}
			if (promptForm.option_b_emoji || promptForm.option_b_image) {
				(promptData as WouldYouRatherData).option_b_visual = {} as any;
				if (promptForm.option_b_emoji) {
					(promptData as WouldYouRatherData).option_b_visual!.emoji = promptForm.option_b_emoji;
				}
				if (promptForm.option_b_image) {
					(promptData as WouldYouRatherData).option_b_visual!.image = promptForm.option_b_image;
				}
			}
			break;

		case 'hot_takes':
			promptData = {
				statement: promptForm.statement,
			} as HotTakesData;

			if (promptForm.statement_emoji || promptForm.statement_image) {
				(promptData as HotTakesData).visual = {} as any;
				if (promptForm.statement_emoji) {
					(promptData as HotTakesData).visual!.emoji = promptForm.statement_emoji;
				}
				if (promptForm.statement_image) {
					(promptData as HotTakesData).visual!.image = promptForm.statement_image;
				}
			}
			break;

		case 'guess_who_said_it':
			promptData = {
				question: promptForm.question,
			} as GuessWhoSaidItData;

			if (promptForm.question_emoji || promptForm.question_image) {
				(promptData as GuessWhoSaidItData).visual = {} as any;
				if (promptForm.question_emoji) {
					(promptData as GuessWhoSaidItData).visual!.emoji = promptForm.question_emoji;
				}
				if (promptForm.question_image) {
					(promptData as GuessWhoSaidItData).visual!.image = promptForm.question_image;
				}
			}
			break;

		case 'most_likely_to':
			promptData = {
				scenario: promptForm.scenario,
			} as MostLikelyToData;

			if (promptForm.scenario_emoji || promptForm.scenario_image) {
				(promptData as MostLikelyToData).visual = {} as any;
				if (promptForm.scenario_emoji) {
					(promptData as MostLikelyToData).visual!.emoji = promptForm.scenario_emoji;
				}
				if (promptForm.scenario_image) {
					(promptData as MostLikelyToData).visual!.image = promptForm.scenario_image;
				}
			}
			break;

		default:
			return;
	}

	const result = await createPrompt(selectedGameType.value, promptData, promptForm.tags);

	if (result.success) {
		resetForm();
		activeTab.value = 1; // Switch to "Your Custom Prompts" tab
	}
};

// Delete prompt
const handleDeletePrompt = async (promptId: string) => {
	if (!confirm('Are you sure you want to delete this prompt?')) return;

	await deletePrompt(promptId);
};

// Load prompts and stats when modal opens
watch(open, async (isOpen) => {
	if (isOpen) {
		await Promise.all([fetchPrompts(), fetchStats()]);
	}
});

// Form validation
const isFormValid = computed(() => {
	switch (selectedGameType.value) {
		case 'would_you_rather':
			return promptForm.option_a.trim() && promptForm.option_b.trim();
		case 'hot_takes':
			return promptForm.statement.trim();
		case 'guess_who_said_it':
			return promptForm.question.trim();
		case 'most_likely_to':
			return promptForm.scenario.trim();
		default:
			return false;
	}
});

// Get game type display info
const getGameTypeInfo = (gameType: string) => {
	const option = gameTypeOptions.find(opt => opt.value === gameType);
	return option || gameTypeOptions[0];
};
</script>

<template>
	<div>
		<UButton
			variant="outline"
			icon="i-heroicons-puzzle-piece"
			@click="open = true"
		>
			Manage Prompts
		</UButton>

		<UModal v-model:open="open" title="Manage Custom Prompts" :ui="{ width: 'sm:max-w-3xl' }">
			<template #body>
				<!-- Stats Bar -->
				<div v-if="stats" class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
					<div class="flex items-center justify-between text-sm">
						<div>
							<span class="font-semibold">{{ stats.total }}</span> total custom prompts
						</div>
						<div>
							<span class="font-semibold">{{ stats.this_week }}</span> created this week
						</div>
						<div>
							<span class="font-semibold text-green-600">{{ stats.remaining_this_week }}</span>
							remaining this week
						</div>
					</div>
				</div>

				<!-- Tabs -->
				<UTabs v-model="activeTab" :items="tabs">
					<!-- Tab 1: Create Custom Prompt -->
					<template #create>
						<div class="space-y-6 py-4">
							<!-- Rate Limit Warning -->
							<UAlert
								v-if="stats && stats.remaining_this_week === 0"
								color="red"
								icon="i-heroicons-exclamation-triangle"
								title="Rate Limit Reached"
								description="You've reached the maximum of 10 custom prompts per week. Try again next week!"
							/>

							<div v-else class="space-y-6">
								<!-- Game Type Selection -->
								<UFormField label="Game Type" required>
									<USelect
										v-model="selectedGameType"
										:items="gameTypeOptions"
									>
										<template #label>
											<div class="flex items-center gap-2">
												<UIcon :name="getGameTypeInfo(selectedGameType).icon" />
												<span>{{ getGameTypeInfo(selectedGameType).label }}</span>
											</div>
										</template>
									</USelect>
								</UFormField>

								<!-- Would You Rather Form -->
								<div v-if="selectedGameType === 'would_you_rather'" class="space-y-4">
									<UFormField label="Option A" required>
										<UInput v-model="promptForm.option_a" placeholder="First option..." />
									</UFormField>

									<div class="grid grid-cols-2 gap-4">
										<UFormField label="Option A Emoji (Optional)">
											<UInput
												v-model="promptForm.option_a_emoji"
												placeholder="🎯"
											/>
										</UFormField>
										<UFormField label="Option A Image (Optional)">
											<UInput
												v-model="promptForm.option_a_image"
												placeholder="https://..."
											/>
										</UFormField>
									</div>

									<UFormField label="Option B" required>
										<UInput v-model="promptForm.option_b" placeholder="Second option..." />
									</UFormField>

									<div class="grid grid-cols-2 gap-4">
										<UFormField label="Option B Emoji (Optional)">
											<UInput
												v-model="promptForm.option_b_emoji"
												placeholder="🎯"
											/>
										</UFormField>
										<UFormField label="Option B Image (Optional)">
											<UInput
												v-model="promptForm.option_b_image"
												placeholder="https://..."
											/>
										</UFormField>
									</div>
								</div>

								<!-- Hot Takes Form -->
								<div v-if="selectedGameType === 'hot_takes'" class="space-y-4">
									<UFormField label="Statement" required>
										<UTextarea
											v-model="promptForm.statement"
											placeholder="Enter a controversial statement..."
											:rows="3"
										/>
									</UFormField>

									<div class="grid grid-cols-2 gap-4">
										<UFormField label="Emoji (Optional)">
											<UInput
												v-model="promptForm.statement_emoji"
												placeholder="🔥"
											/>
										</UFormField>
										<UFormField label="Image (Optional)">
											<UInput
												v-model="promptForm.statement_image"
												placeholder="https://..."
											/>
										</UFormField>
									</div>
								</div>

								<!-- Who Said It Form -->
								<div v-if="selectedGameType === 'guess_who_said_it'" class="space-y-4">
									<UFormField label="Question" required>
										<UTextarea
											v-model="promptForm.question"
											placeholder="Enter a question for players to answer..."
											:rows="3"
										/>
									</UFormField>

									<div class="grid grid-cols-2 gap-4">
										<UFormField label="Emoji (Optional)">
											<UInput
												v-model="promptForm.question_emoji"
												placeholder="❓"
											/>
										</UFormField>
										<UFormField label="Image (Optional)">
											<UInput
												v-model="promptForm.question_image"
												placeholder="https://..."
											/>
										</UFormField>
									</div>
								</div>

								<!-- Most Likely To Form -->
								<div v-if="selectedGameType === 'most_likely_to'" class="space-y-4">
									<UFormField label="Scenario" required>
										<UTextarea
											v-model="promptForm.scenario"
											placeholder="Most likely to..."
											:rows="3"
										/>
									</UFormField>

									<div class="grid grid-cols-2 gap-4">
										<UFormField label="Emoji (Optional)">
											<UInput
												v-model="promptForm.scenario_emoji"
												placeholder="👤"
											/>
										</UFormField>
										<UFormField label="Image (Optional)">
											<UInput
												v-model="promptForm.scenario_image"
												placeholder="https://..."
											/>
										</UFormField>
									</div>
								</div>

								<!-- Error Display -->
								<UAlert
									v-if="error"
									color="red"
									icon="i-heroicons-exclamation-circle"
									:title="error"
								/>

								<!-- Actions -->
								<div class="flex justify-end gap-3">
									<UButton variant="outline" @click="resetForm">
										Clear
									</UButton>
									<UButton
										@click="handleCreatePrompt"
										:loading="loading"
										:disabled="!isFormValid"
									>
										Create Prompt
									</UButton>
								</div>
							</div>
						</div>
					</template>

					<!-- Tab 2: Your Custom Prompts -->
					<template #view>
						<div class="space-y-4 py-4">
							<div v-if="prompts.length === 0" class="text-center py-12">
								<UIcon name="i-heroicons-inbox" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
								<p class="text-gray-400">No custom prompts yet</p>
								<p class="text-sm text-gray-500 mt-1">
									Create your first custom prompt in the other tab!
								</p>
							</div>

							<div v-else class="space-y-3">
								<UCard
									v-for="prompt in prompts"
									:key="prompt.id"
									class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
								>
									<div class="flex items-start justify-between gap-4">
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-2">
												<UIcon
													:name="getGameTypeInfo(prompt.game_type).icon"
													class="w-4 h-4 text-gray-500"
												/>
												<span class="text-xs font-semibold text-gray-500 uppercase">
													{{ getGameTypeInfo(prompt.game_type).label }}
												</span>
												<UBadge size="xs" color="blue">Custom</UBadge>
											</div>

											<p class="text-sm">{{ getPromptDisplayText(prompt) }}</p>

											<div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
												<span>Created by {{ prompt.created_by_username }}</span>
												<span>•</span>
												<span>{{ new Date(prompt.created_at).toLocaleDateString() }}</span>
												<span>•</span>
												<span>Used {{ prompt.usage_count }} times</span>
											</div>
										</div>

										<UButton
											variant="ghost"
											color="red"
											icon="i-heroicons-trash"
											size="sm"
											@click="handleDeletePrompt(prompt.id)"
											:loading="loading"
										/>
									</div>
								</UCard>
							</div>
						</div>
					</template>
				</UTabs>
			</template>
		</UModal>
	</div>
</template>
