<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const props = defineProps<{
	onDelete: (e: Event) => void;
	onEdit: (e: Event) => void;
}>();

const items = ref<DropdownMenuItem[]>([
	{
		label: "Edit",
		icon: "i-lucide-edit",
		onSelect: (e) => props.onEdit(e),
	},
	{
		label: "Delete",
		icon: "i-lucide-trash",
		onSelect: (e) => props.onDelete(e),
	},
]);
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
		<UButton
			icon="i-lucide-menu"
			color="neutral"
			variant="ghost"
		/>
	</UDropdownMenu>
</template>
