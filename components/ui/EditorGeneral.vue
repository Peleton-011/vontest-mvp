<script lang="ts" setup>
const props = withDefaults(
	defineProps<{
		newCommentText: string;
		newCommentParents: string[];
		nodeMap: Map<string, CommentNode>;
		isAdvanced?: boolean;
	}>(),
	{
		isAdvanced: true,
	}
);

const emit = defineEmits<{
	(e: "update:comment-text", payload: string): void;
	(e: "update:comment-parents", parents: string[]): void;
	(e: "post-comment" | "cancel"): void;
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
</script>
<template>
	<div>
		<UiAdvancedEditor
			v-if="isAdvanced"
			:new-comment-text="localCommentText"
			:new-comment-parents="newCommentParents"
			:parent-refs="
				props.newCommentParents.map((id) => {
					const node = props.nodeMap.get(id)!;
					return {
						id,
						author: node.author!,
						comment: {
							text: node.comment,
							createdAt: node.createdAt,
						},
					};
				})
			"
			@cancel="emit('cancel')"
			@post-comment="emit('post-comment')"
			@update:comment-text="localCommentText = $event"
			@update:comment-parents="emit('update:comment-parents', $event)"
		/>
		<UiSimpleEditor
			v-else
			:new-comment-text="localCommentText"
			@cancel="emit('cancel')"
			@post-comment="emit('post-comment')"
			@update:comment-text="localCommentText = $event"
		/>
	</div>
</template>


