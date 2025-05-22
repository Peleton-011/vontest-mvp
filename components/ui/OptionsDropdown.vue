<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const props = defineProps<{
	delete: (e: Event) => void;
	edit: (e: Event) => void;
}>();

const items = ref<DropdownMenuItem[]>([
	{
		label: "Edit",
		icon: "i-lucide-edit",
		onSelect: (e) => props.edit(e),
	},
	{
		label: "Delete",
		icon: "i-lucide-trash",
		onSelect: (e) => props.delete(e),
	},
]);
</script>

<template>
	<UDropdownMenu
		:items="items"
		:content="{
			align: 'start',
			side: 'bottom',
			sideOffset: 8,
		}"
		:ui="{
			content: 'w-48',
		}"
	>
		<UButton
			label="Open"
			icon="i-lucide-menu"
			color="neutral"
			variant="outline"
		/>
	</UDropdownMenu>
</template>
