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
	(e: "post-comment" | "cancel"): void;
}>();
</script>
<template>
	<div class="mb-4">
		<textarea
			v-model="localCommentText"
			class="w-full p-2 rounded bg-gray-800"
			rows="3"
			placeholder="Write your reply..."
		/>
		<div class="text-right mt-2">
			<UButton
				label="Post Comment"
				:disabled="!localCommentText.trim()"
				@click="
					emit('post-comment');
				"
			/>
			<UButton
				label="Cancel"
				variant="subtle"
				@click="
					emit('cancel');
				"
			/>
		</div>
	</div>
</template>
