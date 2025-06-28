<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const props = defineProps<{
	isAdvanced: boolean;
}>();

const emit = defineEmits<{
	(e: "toggle-editor"): void;
}>();

const { settings, fetchSettings, updateSettings } = useUserSettings();

onMounted(fetchSettings);

// const isAdvanced = computed(() => {
// 	return settings?.value?.defaultEditor === "advanced";
// });

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
		label:
			"Change default editor to " +
			(props.isAdvanced ? "Simple" : "Advanced"),
		icon: "i-lucide-repeat",
		ui: {
			itemTrailingIcon: "order-last ml-2",
		},
		onSelect: (e: Event) =>
			updateSettings({
				...settings.value,
				defaultEditor: props.isAdvanced ? "simple" : "advanced",
			}),
	};

	const options = [];
    //If it's the main editor, add option to open the other one
	if (props.isAdvanced === (settings?.value?.defaultEditor === "advanced")) {
		options.push(props.isAdvanced ? simple : advanced);
	}
    //Always add option to toggle the default
	options.push(toggleDefault);

	return options;
	12;
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
			content: 'w-auto',
		}"
	>
		<UButton icon="i-lucide-menu" color="neutral" variant="ghost" />
	</UDropdownMenu>
</template>
