<script lang="ts" setup>
const props = withDefaults(
	defineProps<{
		newCommentText: string;
		newCommentParents: string[];
		nodeMap: Map<string, CommentNode>;
		isAlternate?: boolean;
	}>(),
	{
		isAlternate: true,
	}
);

const { settings, fetchSettings } = useUserSettings();
onMounted(fetchSettings);

const isAdvanced = computed(() => {
	const defaultValue = settings?.value?.defaultEditor === "advanced";
	//If the editor opened is the alternate one, the type will be the opposite
	return props.isAlternate ? !defaultValue : defaultValue;
});

const emit = defineEmits<{
	(e: "update:comment-text", payload: string): void;
	(e: "update:comment-parents", parents: string[]): void;
	(e: "post-comment" | "cancel" | "toggle-editor"): void;
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
		<UiEditorAdvanced
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
			@toggle-editor="emit('toggle-editor')"
		/>
		<UiEditorSimple
			v-else
			:new-comment-text="localCommentText"
			@cancel="emit('cancel')"
			@post-comment="emit('post-comment')"
			@update:comment-text="localCommentText = $event"
			@toggle-editor="emit('toggle-editor')"
		/>
	</div>
</template>
