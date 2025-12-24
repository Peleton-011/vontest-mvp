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

// Use defineModel for v-model:open support
const open = defineModel<boolean>('open', { default: false });

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
		key: 'create',
		label: 'Create Custom Prompt',
		icon: 'i-heroicons-plus-circle'
	},
	{
		key: 'view',
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
	option_a_visual_type: '' as 'emoji' | 'image' | '',
	option_a_visual_value: '',
	option_b_visual_type: '' as 'emoji' | 'image' | '',
	option_b_visual_value: '',

	// Hot Takes
	statement: '',

	// Guess Who Said It
	question: '',

	// Most Likely To
	scenario: '',

	// Shared visual (for non-WYR games)
	visual_type: '' as 'emoji' | 'image' | '',
	visual_value: '',

	// Tags
	tags: [] as string[],
});

// Game type options
const gameTypeOptions = [
	{ value: 'would_you_rather', label: 'Would You Rather', icon: GAME_TYPES.would_you_rather.icon },
	{ value: 'hot_takes', label: 'Hot Takes', icon: GAME_TYPES.hot_takes.icon },
	{ value: 'guess_who_said_it', label: 'Guess Who Said It', icon: GAME_TYPES.guess_who_said_it.icon },
	{ value: 'most_likely_to', label: 'Most Likely To', icon: GAME_TYPES.most_likely_to.icon },
];

// Visual type options
const visualTypeOptions = [
	{ value: '', label: 'None' },
	{ value: 'emoji', label: 'Emoji' },
	{ value: 'image', label: 'Image URL' },
];

// Reset form
const resetForm = () => {
	Object.assign(promptForm, {
		option_a: '',
		option_b: '',
		option_a_visual_type: '',
		option_a_visual_value: '',
		option_b_visual_type: '',
		option_b_visual_value: '',
		statement: '',
		question: '',
		scenario: '',
		visual_type: '',
		visual_value: '',
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

			// Add visuals if provided
			if (promptForm.option_a_visual_type && promptForm.option_a_visual_value) {
				(promptData as WouldYouRatherData).option_a_visual = {
					type: promptForm.option_a_visual_type,
					value: promptForm.option_a_visual_value,
				};
			}
			if (promptForm.option_b_visual_type && promptForm.option_b_visual_value) {
				(promptData as WouldYouRatherData).option_b_visual = {
					type: promptForm.option_b_visual_type,
					value: promptForm.option_b_visual_value,
				};
			}
			break;

		case 'hot_takes':
			promptData = {
				statement: promptForm.statement,
			} as HotTakesData;

			if (promptForm.visual_type && promptForm.visual_value) {
				(promptData as HotTakesData).visual = {
					type: promptForm.visual_type,
					value: promptForm.visual_value,
				};
			}
			break;

		case 'guess_who_said_it':
			promptData = {
				question: promptForm.question,
			} as GuessWhoSaidItData;

			if (promptForm.visual_type && promptForm.visual_value) {
				(promptData as GuessWhoSaidItData).visual = {
					type: promptForm.visual_type,
					value: promptForm.visual_value,
				};
			}
			break;

		case 'most_likely_to':
			promptData = {
				scenario: promptForm.scenario,
			} as MostLikelyToData;

			if (promptForm.visual_type && promptForm.visual_value) {
				(promptData as MostLikelyToData).visual = {
					type: promptForm.visual_type,
					value: promptForm.visual_value,
				};
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
	<UModal v-model:open="open" :ui="{ width: 'sm:max-w-3xl' }">
		<UCard>
			<template #header>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<UIcon name="i-heroicons-sparkles" class="w-6 h-6 text-primary-600" />
						<h2 class="text-xl font-bold">Manage Custom Prompts</h2>
					</div>
					<UButton
						variant="ghost"
						icon="i-heroicons-x-mark"
						size="sm"
						@click="open = false"
					/>
				</div>

				<!-- Stats Bar -->
				<div v-if="stats" class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
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
			</template>

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
								<USelectMenu
									v-model="selectedGameType"
									:options="gameTypeOptions"
									option-attribute="label"
									value-attribute="value"
								>
									<template #label>
										<div class="flex items-center gap-2">
											<UIcon :name="getGameTypeInfo(selectedGameType).icon" />
											<span>{{ getGameTypeInfo(selectedGameType).label }}</span>
										</div>
									</template>
								</USelectMenu>
							</UFormField>

							<!-- Would You Rather Form -->
							<div v-if="selectedGameType === 'would_you_rather'" class="space-y-4">
								<UFormField label="Option A" required>
									<UInput v-model="promptForm.option_a" placeholder="First option..." />
								</UFormField>

								<div class="grid grid-cols-2 gap-4">
									<UFormField label="Option A Visual">
										<USelectMenu
											v-model="promptForm.option_a_visual_type"
											:options="visualTypeOptions"
											option-attribute="label"
											value-attribute="value"
										/>
									</UFormField>
									<UFormField
										v-if="promptForm.option_a_visual_type"
										:label="promptForm.option_a_visual_type === 'emoji' ? 'Emoji' : 'Image URL'"
									>
										<UInput
											v-model="promptForm.option_a_visual_value"
											:placeholder="promptForm.option_a_visual_type === 'emoji' ? '🎯' : 'https://...'"
										/>
									</UFormField>
								</div>

								<UFormField label="Option B" required>
									<UInput v-model="promptForm.option_b" placeholder="Second option..." />
								</UFormField>

								<div class="grid grid-cols-2 gap-4">
									<UFormField label="Option B Visual">
										<USelectMenu
											v-model="promptForm.option_b_visual_type"
											:options="visualTypeOptions"
											option-attribute="label"
											value-attribute="value"
										/>
									</UFormField>
									<UFormField
										v-if="promptForm.option_b_visual_type"
										:label="promptForm.option_b_visual_type === 'emoji' ? 'Emoji' : 'Image URL'"
									>
										<UInput
											v-model="promptForm.option_b_visual_value"
											:placeholder="promptForm.option_b_visual_type === 'emoji' ? '🎯' : 'https://...'"
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
									<UFormField label="Visual Element">
										<USelectMenu
											v-model="promptForm.visual_type"
											:options="visualTypeOptions"
											option-attribute="label"
											value-attribute="value"
										/>
									</UFormField>
									<UFormField
										v-if="promptForm.visual_type"
										:label="promptForm.visual_type === 'emoji' ? 'Emoji' : 'Image URL'"
									>
										<UInput
											v-model="promptForm.visual_value"
											:placeholder="promptForm.visual_type === 'emoji' ? '🔥' : 'https://...'"
										/>
									</UFormField>
								</div>
							</div>

							<!-- Guess Who Said It Form -->
							<div v-if="selectedGameType === 'guess_who_said_it'" class="space-y-4">
								<UFormField label="Question" required>
									<UTextarea
										v-model="promptForm.question"
										placeholder="Enter a question for players to answer..."
										:rows="3"
									/>
								</UFormField>

								<div class="grid grid-cols-2 gap-4">
									<UFormField label="Visual Element">
										<USelectMenu
											v-model="promptForm.visual_type"
											:options="visualTypeOptions"
											option-attribute="label"
											value-attribute="value"
										/>
									</UFormField>
									<UFormField
										v-if="promptForm.visual_type"
										:label="promptForm.visual_type === 'emoji' ? 'Emoji' : 'Image URL'"
									>
										<UInput
											v-model="promptForm.visual_value"
											:placeholder="promptForm.visual_type === 'emoji' ? '❓' : 'https://...'"
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
									<UFormField label="Visual Element">
										<USelectMenu
											v-model="promptForm.visual_type"
											:options="visualTypeOptions"
											option-attribute="label"
											value-attribute="value"
										/>
									</UFormField>
									<UFormField
										v-if="promptForm.visual_type"
										:label="promptForm.visual_type === 'emoji' ? 'Emoji' : 'Image URL'"
									>
										<UInput
											v-model="promptForm.visual_value"
											:placeholder="promptForm.visual_type === 'emoji' ? '👤' : 'https://...'"
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
							<p class="text-gray-600">No custom prompts yet</p>
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
		</UCard>
	</UModal>
</template>
