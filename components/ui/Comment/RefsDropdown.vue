<script setup lang="ts">
import type { Ref } from "./Refs.vue";
const props = defineProps<{ refs: Ref[] }>();
const emit = defineEmits<{
	(e: "remove-ref" | "activate-reference", payload: string): void;
}>();
</script>

<template>
	<UPopover
		:dismissible="false"
		:content="{ align: 'start', sideOffset: 4 }"
        trigger="hover"
	>
		<!-- Trigger button -->
		<slot />

		<template #content>
			<ul class="text-gray-400 flex flex-col space-y-1 ">
				<li
					v-for="ref in props.refs"
					:key="ref.id"
					class="flex justify-between items-center gap-10"
				>
					<UiCommentRef
						:reference="ref"
						@activate-reference="emit('activate-reference', ref.id)"
					/>
					<UButton
						variant="ghost"
						icon="i-lucide-x"
						@click="emit('remove-ref', ref.id)"
					/>
				</li>
			</ul>
		</template>
	</UPopover>
</template>
