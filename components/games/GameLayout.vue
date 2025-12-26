<script setup lang="ts">
import type { GameMetadata } from '~/types/games';

const props = defineProps<{
	gameMetadata: GameMetadata;
	loading?: boolean;
	currentGame?: any;
	userResponse?: any;
	isAdmin?: boolean;
	responseCount: number;
	showResults: boolean;
	error?: string | null;
	adminButtonLabel?: string;
}>();

const emit = defineEmits<{
	'complete-game': [];
}>();

const handleCompleteGame = () => {
	emit('complete-game');
};
</script>

<template>
	<div class="game-layout space-y-8">
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

				<!-- Game Content Slot -->
				<slot name="game-content" />
			</div>

			<!-- Divider -->
			<div class="border-t border-gray-200 dark:border-gray-700"></div>

			<!-- SECTION 2: Results & Stats -->
			<div class="space-y-6">
				<!-- Results Heading with Admin Controls -->
				<div class="flex items-center justify-between">
					<h3 class="text-xl font-bold">Results</h3>
					<div v-if="isAdmin && currentGame.status === 'active'" class="flex gap-2">
						<slot name="admin-controls">
							<UButton
								variant="outline"
								size="sm"
								icon="i-heroicons-check-circle"
								:loading="loading"
								@click="handleCompleteGame"
							>
								{{ adminButtonLabel || 'End Game & Publish Results' }}
							</UButton>
						</slot>
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
				<div v-if="showResults">
					<slot name="results" />
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
