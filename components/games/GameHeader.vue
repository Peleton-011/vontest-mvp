<template>
	<div class="flex items-start justify-between gap-4">
		<div class="flex items-start gap-4 flex-1">
			<div
				class="p-3 rounded-lg"
				:class="[
					`bg-${metadata.color}-100 dark:bg-${metadata.color}-900/20`
				]"
			>
				<UIcon
					:name="metadata.icon"
					class="w-8 h-8"
					:class="`text-${metadata.color}-600`"
					aria-hidden="true"
				/>
			</div>
			<div class="flex-1">
				<h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
					{{ metadata.name }}
				</h2>
				<p class="text-gray-600 dark:text-gray-400 mt-1">
					{{ metadata.description }}
				</p>
			</div>
		</div>

		<UPopover v-if="showHowToPlay">
			<UButton
				variant="ghost"
				icon="i-heroicons-question-mark-circle"
				aria-label="How to play instructions"
			/>
			<template #panel>
				<div class="p-4 max-w-sm">
					<h3 class="font-semibold mb-2">How to Play</h3>
					<ol class="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
						<li v-for="(step, index) in metadata.howToPlay" :key="index">
							{{ step }}
						</li>
					</ol>
				</div>
			</template>
		</UPopover>
	</div>
</template>

<script setup lang="ts">
import type { GameTypeMetadata } from '~/types/games';

withDefaults(
	defineProps<{
		metadata: GameTypeMetadata;
		showHowToPlay?: boolean;
	}>(),
	{
		showHowToPlay: true,
	}
);
</script>
