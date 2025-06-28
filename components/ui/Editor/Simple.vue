<script lang="ts" setup>
const props = defineProps<{
	newCommentText: string;
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
	(e: "post-comment" | "cancel" | "toggle-editor"): void;
}>();
</script>
<template>
	<div class="flex flex-col">
		<div class="relative mb-4">
			<textarea
				v-model="localCommentText"
				class="w-full p-2 rounded bg-gray-800"
				rows="3"
				placeholder="Write your reply..."
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
