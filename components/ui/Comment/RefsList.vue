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
	<ul class="text-gray-400 relative flex flex-col ml-4">
		<li
			v-for="ref in props.refs"
			:key="ref.id"
			class="my-1 list-disc flex justify-between items-center"
		>
			<UiCommentRef
            class="ml-1"
				:reference="ref"
				@activate-reference="emit('activate-reference', $event)"
			/>
			<UButton
				variant="ghost"
				icon="i-lucide-x"
				@click="emit('remove-ref', ref.id)"
			/>
		</li>
	</ul>
</template>

<style scoped>
li::before {
	content: "•";
	position: absolute;
    display: inline-block;
    height: 100%;
	left: 0;
	color: #9ca3af; /* Tailwind gray-400 */
}
</style>
