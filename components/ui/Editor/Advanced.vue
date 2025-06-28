<script lang="ts" setup>
import type { Ref } from "../Comment/Refs.vue";
const props = defineProps<{
	newCommentText: string;
	newCommentParents: string[];
	parentRefs: Ref[];
}>();

// Computed getter/setter for this node’s comment text
const localCommentText = computed<string>({
	get: () => {
		return props.newCommentText || "";
	},
	set: (val: string) => {
		emit("update:comment-text", val);
	},
});

const emit = defineEmits<{
	(e: "update:comment-text", payload: string): void;
	(e: "update:comment-parents", parents: string[]): void;
	(e: "post-comment" | "cancel" | "toggle-editor"): void;
}>();

const handleDeleteRef = (id: string) => {
	const newCommentParents = props.newCommentParents.filter(
		(toRemove) => id !== toRemove
	);
	emit("update:comment-parents", newCommentParents);
};
</script>
<template>
	<div class="flex flex-col p-4 h-1/3">
		<!-- Body -->
		<div class="flex items-stretch">
			<div class="flex flex-col w-2/3">
				<ClientOnly>
					<!-- class="w-full rounded-[calc(var(--ui-radius)*1.5)] border-0 placeholder:text-(--ui-text-dimmed) focus:outline-none disabled:cursor-not-allowed disabled:opacity-75 transition-colors px-2.5 py-1.5 text-sm gap-1.5 text-(--ui-text-highlighted) bg-(--ui-bg) ring ring-inset ring-(--ui-border-accented) focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[--ui-primary]" -->
					<MdEditor
						id="description"
						v-model="localCommentText"
						class="flex flex-grow"
					/>
				</ClientOnly>
			</div>
			<div class="p-2 w-1/3 flex flex-col">
				<div class="mb-4 flex justify-between">
					<h2 class="text-lg font-semibold mb-2">Replying To:</h2>
					<UiCommentEditorOptions
                        :is-advanced="true"
						@toggle-editor="emit('toggle-editor')"
					/>
				</div>
				<div>
					<UiRefsList
						:refs="parentRefs"
						@remove-ref="handleDeleteRef"
					/>
				</div>
			</div>
		</div>
		<!-- Footer -->
		<div class="flex justify-around mt-4">
			<UButton
				class="w-1/6 text-center"
				label="Post"
				:disabled="!localCommentText.trim()"
				@click="emit('post-comment')"
			/>
			<UButton
				class="w-1/6 text-center"
				label="Cancel"
				variant="subtle"
				@click="emit('cancel')"
			/>
		</div>
	</div>
</template>
