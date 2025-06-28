<script lang="ts" setup>
import type { Ref } from "./Refs.vue";

const props = defineProps<{
	refs: Ref[];
}>();

const emit = defineEmits<{
	(e: "remove-ref" | "activate-reference", payload: string): void;
}>();
</script>
<template>
	<ul class="list-disc list-inside text-gray-400">
		<li v-for="ref in props.refs" :key="ref.id" class="my-1 flex justify-between align-center">
			<UiCommentRef :reference="ref" @activate-reference="emit('activate-reference', $event)"/>
			<UButton
				variant="ghost"
				icon="i-lucide-x"
				@click="emit('remove-ref', ref.id)"
			/>
		</li>
	</ul>
</template>
