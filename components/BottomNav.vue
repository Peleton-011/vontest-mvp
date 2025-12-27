<template>
	<nav
		class="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800 md:hidden bottom-nav-safe"
		role="navigation"
		aria-label="Group navigation"
	>
		<div class="grid grid-cols-4 h-16">
			<button
				v-for="tab in tabs"
				:key="tab.value"
				@click="setActiveTab(tab.value)"
				:aria-label="`Navigate to ${tab.label}`"
				:aria-current="modelValue === tab.value ? 'page' : undefined"
				class="flex flex-col items-center justify-center gap-1 transition-colors touch-target"
				:class="[
					modelValue === tab.value
						? 'text-primary-600 dark:text-primary-500'
						: 'text-gray-500 dark:text-gray-400'
				]"
			>
				<UIcon :name="tab.icon" class="w-6 h-6" aria-hidden="true" />
				<span
					class="text-[10px] font-medium leading-none"
					:class="{ 'font-semibold': modelValue === tab.value }"
				>
					{{ tab.label }}
				</span>
			</button>
		</div>
	</nav>
</template>

<script setup lang="ts">
interface Tab {
	value: string;
	label: string;
	icon: string;
	slot?: string;
}

const props = defineProps<{
	modelValue: string;
	tabs: Tab[];
}>();

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const setActiveTab = (value: string) => {
	emit('update:modelValue', value);

	// Haptic feedback on iOS/Android (if available)
	if (process.client && window.navigator.vibrate) {
		window.navigator.vibrate(10);
	}
};
</script>
