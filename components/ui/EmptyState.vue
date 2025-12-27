<template>
	<div class="text-center py-12" role="status">
		<div
			class="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4"
		>
			<UIcon
				:name="icon"
				class="w-10 h-10 text-gray-400 dark:text-gray-500"
				aria-hidden="true"
			/>
		</div>
		<h3 class="text-xl font-semibold text-gray-900 dark:text-white">
			{{ title }}
		</h3>
		<p class="text-gray-600 dark:text-gray-400 mt-2 max-w-md mx-auto">
			{{ description }}
		</p>
		<div v-if="$slots.action" class="mt-6">
			<slot name="action" />
		</div>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	icon: string;
	title: string;
	description: string;
}>();
</script>
