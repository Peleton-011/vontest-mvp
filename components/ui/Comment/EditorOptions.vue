<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const props = defineProps<{
	onDelete: (e: Event) => void;
	onEdit: (e: Event) => void;
}>();

const emit = defineEmits<{
	(e: "toggle-editor"): void;
}>();

const { settings, fetchSettings, updateSettings } = useUserSettings();

onMounted(fetchSettings);

const isAdvanced = computed(() => {
	return settings?.value?.defaultEditor === "advanced";
});

const items = computed<DropdownMenuItem[]>(() => {
	const advanced = {
		label: "Open Advanced Editor",
		icon: "i-lucide-pen-tool",
		onSelect: (e: Event) => emit("toggle-editor"),
	};

	const simple = {
		label: "Open Simple Editor",
		icon: "i-lucide-pen",
		onSelect: (e: Event) => emit("toggle-editor"),
	};

	const toggleDefault = {
		label: "Change Default Editor to " + isAdvanced ? "Simple" : "Advanced",
		icon: "i-lucide-repeat",
		onSelect: (e: Event) =>
			updateSettings({
				...settings.value,
				defaultEditor: isAdvanced ? "simple" : "advanced",
			}),
	};

	const options = [];
	options.push(isAdvanced ? simple : advanced);
	options.push(toggleDefault);

	return options;
});
</script>

<template>
	<UDropdownMenu
		:items="items"
		:content="{
			align: 'end',
			side: 'bottom',
			sideOffset: 8,
		}"
		:ui="{
			content: 'w-12',
		}"
	>
		<UButton icon="i-lucide-menu" color="neutral" variant="ghost" />
	</UDropdownMenu>
</template>
