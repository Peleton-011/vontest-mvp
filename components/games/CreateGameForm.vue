<script setup lang="ts">
import { getAllGameTypes, getGameMetadata, type GameType } from '~/types/games';
import type { WouldYouRatherPrompt } from '~/composables/games/useWouldYouRather';
import type { StepperItem } from '@nuxt/ui';

const props = defineProps<{
	groupId: string;
}>();

const emit = defineEmits<{
	created: [gameId: string, gameType: GameType];
	cancel: [];
}>();

const { createGame: createWYRGame } = useWouldYouRather(props.groupId);

// Form state
const step = ref(0);
const stepper = useTemplateRef('stepper');

const selectedGameType = ref<GameType | null>(null);
const gameTypeMetadata = computed(() =>
	selectedGameType.value ? getGameMetadata(selectedGameType.value) : null
);

// Game-specific form data
const wouldYouRatherForm = reactive({
	option_a: '',
	option_b: '',
});

const loading = ref(false);
const error = ref<string | null>(null);

// Available game types
const availableGameTypes = getAllGameTypes();

// Stepper items
const stepperItems = ref<StepperItem[]>([
	{
		title: 'Select Game',
		icon: 'i-heroicons-puzzle-piece',
		slot: 'select' as const,
	},
	{
		title: 'Configure',
		icon: 'i-heroicons-cog-6-tooth',
		slot: 'configure' as const,
	},
	{
		title: 'Review',
		icon: 'i-heroicons-check',
		slot: 'review' as const,
	},
]);

// Select game type
const selectGameType = (gameType: GameType) => {
	selectedGameType.value = gameType;
	stepper.value?.next();
};

// Validation for step 2
const isConfigureStepValid = computed(() => {
	if (!selectedGameType.value) return false;

	switch (selectedGameType.value) {
		case 'would_you_rather':
			return (
				wouldYouRatherForm.option_a.trim().length > 0 &&
				wouldYouRatherForm.option_b.trim().length > 0
			);
		default:
			return false;
	}
});

// Create the game
const createGame = async () => {
	if (!selectedGameType.value) return;

	loading.value = true;
	error.value = null;

	try {
		let result: any;

		switch (selectedGameType.value) {
			case 'would_you_rather':
				result = await createWYRGame({
					option_a: wouldYouRatherForm.option_a,
					option_b: wouldYouRatherForm.option_b,
				} as WouldYouRatherPrompt);
				break;
			default:
				throw new Error('Game type not implemented');
		}

		if (result.success && result.gameId) {
			emit('created', result.gameId, selectedGameType.value);
		} else {
			error.value = result.error || 'Failed to create game';
		}
	} catch (e: any) {
		error.value = e.message || 'An error occurred';
	} finally {
		loading.value = false;
	}
};

const handleCancel = () => {
	emit('cancel');
};
</script>

<template>
	<div class="create-game-form">
		<!-- Error Display -->
		<div v-if="error" class="mb-6 p-4 bg-red-50 text-red-600 rounded">
			{{ error }}
		</div>

		<UStepper
			id="stepper"
			ref="stepper"
			v-model="step"
			:items="stepperItems"
		>
			<!-- Step 1: Select Game Type -->
			<template #select>
				<div class="space-y-4">
					<h3 class="text-xl font-bold mb-4">Choose a Game</h3>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<UCard
							v-for="gameType in availableGameTypes"
							:key="gameType.id"
							class="cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all"
							@click="selectGameType(gameType.id)"
						>
							<div class="flex items-start gap-4">
								<div
									:class="[
										'p-3 rounded-lg',
										`bg-${gameType.color}-100 dark:bg-${gameType.color}-900/20`,
									]"
								>
									<UIcon
										:name="gameType.icon"
										:class="[
											'w-6 h-6',
											`text-${gameType.color}-600`,
										]"
									/>
								</div>
								<div class="flex-1">
									<h4 class="font-semibold text-lg">
										{{ gameType.name }}
									</h4>
									<p class="text-sm text-gray-600 mt-1">
										{{ gameType.description }}
									</p>
									<div class="flex gap-4 mt-2 text-xs text-gray-500">
										<span>
											<UIcon name="i-heroicons-users" class="w-3 h-3 inline" />
											{{ gameType.minPlayers }}+ players
										</span>
										<span>
											<UIcon name="i-heroicons-clock" class="w-3 h-3 inline" />
											{{ gameType.estimatedTime }}
										</span>
									</div>
								</div>
							</div>
						</UCard>
					</div>
				</div>
			</template>

			<!-- Step 2: Configure Game -->
			<template #configure>
				<div v-if="selectedGameType" class="space-y-6">
					<!-- Game Info Header -->
					<div class="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
						<div
							:class="[
								'p-3 rounded-lg',
								`bg-${gameTypeMetadata?.color}-100 dark:bg-${gameTypeMetadata?.color}-900/20`,
							]"
						>
							<UIcon
								:name="gameTypeMetadata?.icon || ''"
								:class="[
									'w-6 h-6',
									`text-${gameTypeMetadata?.color}-600`,
								]"
							/>
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-bold">{{ gameTypeMetadata?.name }}</h3>
							<p class="text-sm text-gray-600 mt-1">
								{{ gameTypeMetadata?.detailedDescription }}
							</p>
						</div>
					</div>

					<!-- Would You Rather Configuration -->
					<div v-if="selectedGameType === 'would_you_rather'" class="space-y-4">
						<h4 class="font-semibold">Enter Your Question</h4>

						<UFormGroup label="Option A" required>
							<UInput
								v-model="wouldYouRatherForm.option_a"
								placeholder="e.g., Have the ability to fly"
								size="lg"
							/>
						</UFormGroup>

						<div class="text-center text-gray-400 font-bold">OR</div>

						<UFormGroup label="Option B" required>
							<UInput
								v-model="wouldYouRatherForm.option_b"
								placeholder="e.g., Have the ability to become invisible"
								size="lg"
							/>
						</UFormGroup>
					</div>

					<!-- Placeholder for other game types -->
					<div v-else class="text-center py-12 text-gray-500">
						<p>Configuration for {{ gameTypeMetadata?.name }} coming soon!</p>
					</div>
				</div>
			</template>

			<!-- Step 3: Review & Create -->
			<template #review>
				<div v-if="selectedGameType" class="space-y-6">
					<h3 class="text-xl font-bold">Review Your Game</h3>

					<!-- Game Type -->
					<div class="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
						<div
							:class="[
								'p-3 rounded-lg',
								`bg-${gameTypeMetadata?.color}-100 dark:bg-${gameTypeMetadata?.color}-900/20`,
							]"
						>
							<UIcon
								:name="gameTypeMetadata?.icon || ''"
								:class="[
									'w-6 h-6',
									`text-${gameTypeMetadata?.color}-600`,
								]"
							/>
						</div>
						<div>
							<p class="text-sm text-gray-600">Game Type</p>
							<p class="font-semibold">{{ gameTypeMetadata?.name }}</p>
						</div>
					</div>

					<!-- Would You Rather Preview -->
					<div v-if="selectedGameType === 'would_you_rather'" class="space-y-4">
						<div>
							<p class="text-sm text-gray-600 mb-2">Your Question</p>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
									<div class="text-2xl font-bold text-blue-600 mb-2">A</div>
									<p>{{ wouldYouRatherForm.option_a }}</p>
								</div>
								<div class="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
									<div class="text-2xl font-bold text-purple-600 mb-2">B</div>
									<p>{{ wouldYouRatherForm.option_b }}</p>
								</div>
							</div>
						</div>

						<!-- How to Play -->
						<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<p class="font-semibold mb-2">How This Works:</p>
							<ol class="text-sm text-gray-600 space-y-1 list-decimal list-inside">
								<li v-for="(s, index) in gameTypeMetadata?.howToPlay" :key="index">
									{{ s }}
								</li>
							</ol>
						</div>
					</div>
				</div>
			</template>
		</UStepper>

		<!-- Stepper Control Buttons -->
		<div class="flex justify-between mt-6">
			<UButton
				variant="outline"
				:leading-icon="stepper?.hasPrev ? 'i-heroicons-arrow-left' : ''"
				:trailing-icon="stepper?.hasPrev ? '' : 'i-heroicons-x-mark'"
				@click="stepper?.hasPrev ? stepper?.prev() : handleCancel()"
			>
				{{ stepper?.hasPrev ? 'Back' : 'Cancel' }}
			</UButton>
			<UButton
				:loading="loading"
				:trailing-icon="stepper?.hasNext ? 'i-heroicons-arrow-right' : 'i-heroicons-check'"
				:disabled="step === 1 && !isConfigureStepValid"
				@click="stepper?.hasNext ? stepper?.next() : createGame()"
			>
				{{ stepper?.hasNext ? 'Next' : 'Create Game' }}
			</UButton>
		</div>
	</div>
</template>
