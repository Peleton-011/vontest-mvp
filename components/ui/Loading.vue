<template>
	<div
		class="flex flex-col items-center justify-center"
		:class="containerClasses"
		role="status"
		aria-live="polite"
		aria-busy="true"
	>
		<div class="relative">
			<!-- Pulse background -->
			<div
				v-if="variant !== 'compact'"
				class="absolute inset-0 bg-primary-500 rounded-full opacity-20 animate-ping"
			></div>
			<!-- Spinner -->
			<UIcon
				:name="icon"
				:class="iconClasses"
				class="animate-spin relative"
				aria-hidden="true"
			/>
		</div>
		<p
			v-if="message && variant !== 'compact'"
			class="mt-4 text-gray-600 dark:text-gray-400"
			aria-hidden="true"
		>
			{{ message }}
		</p>
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

const containerClasses = computed(() => {
	switch (props.variant) {
		case 'fullscreen':
			return 'min-h-screen';
		case 'compact':
			return 'py-2';
		default:
			return 'py-12';
	}
});

const iconClasses = computed(() => {
	switch (props.variant) {
		case 'compact':
			return 'w-4 h-4';
		case 'inline':
			return 'w-6 h-6';
		default:
			return 'w-8 h-8';
	}
});
</script>

<style scoped>
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border-width: 0;
}
</style>
