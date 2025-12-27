<template>
	<div
		class="flex flex-col items-center justify-center"
		:class="variantClasses"
		role="status"
		aria-live="polite"
		aria-busy="true"
	>
		<div class="relative">
			<!-- Pulse background for visual effect -->
			<div
				class="absolute inset-0 bg-primary-500 rounded-full opacity-20 animate-ping"
				aria-hidden="true"
			></div>
			<!-- Spinning icon -->
			<UIcon
				:name="icon"
				:class="iconClasses"
				class="animate-spin relative"
				aria-hidden="true"
			/>
		</div>
		<p v-if="message" class="mt-4 text-gray-400 dark:text-gray-500">
			{{ message }}
		</p>
		<!-- Screen reader only text -->
		<span class="sr-only">{{ message || 'Loading, please wait' }}</span>
	</div>
</template>

<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		variant?: 'fullscreen' | 'inline' | 'compact';
		message?: string;
		icon?: string;
	}>(),
	{
		variant: 'inline',
		icon: 'i-heroicons-arrow-path',
	}
);

const variantClasses = computed(() => {
	switch (props.variant) {
		case 'fullscreen':
			return 'min-h-screen';
		case 'compact':
			return 'py-4';
		default:
			return 'py-12';
	}
});

const iconClasses = computed(() => {
	switch (props.variant) {
		case 'compact':
			return 'w-4 h-4 text-primary-500';
		case 'inline':
			return 'w-6 h-6 text-primary-500';
		default:
			return 'w-8 h-8 text-primary-500';
	}
});
</script>
