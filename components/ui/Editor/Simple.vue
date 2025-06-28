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
	(e: "update:comment-text" | "activate-reference", payload: string): void;
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
	<div class="flex flex-col p-4">
		<div v-if="parentRefs.length" class="flex align-center mb-2 gap-2">
			<h2
				class="text-lg font-semibold mb-0 leading-none flex items-center"
			>
				Replying To:
			</h2>
			<UiCommentRefs
				:refs="parentRefs"
				direction="editor"
				@remove-ref="handleDeleteRef"
				@activate-reference="emit('activate-reference', $event)"
			/>
		</div>
		<div class="relative mb-4">
			<textarea
				v-model="localCommentText"
				class="w-full p-2 rounded bg-gray-800"
				rows="3"
				:placeholder="
					parentRefs.length
						? 'Write your reply...'
						: 'Write your comment...'
				"
			/>
			<UiCommentEditorOptions
				class="absolute top-2 right-2 z-10"
				:is-advanced="false"
				@toggle-editor="emit('toggle-editor')"
			/>
			<div class="text-right mt-2">
				<UButton
					label="Post Comment"
					:disabled="!localCommentText.trim()"
					@click="emit('post-comment')"
				/>
				<UButton
					label="Cancel"
					variant="subtle"
					@click="emit('cancel')"
				/>
			</div>
		</div>
	</div>
</template>
