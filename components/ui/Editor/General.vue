<script lang="ts" setup>
const props = withDefaults(
	defineProps<{
		newCommentParents: string[];
		nodeMap: Map<string, CommentNode>;
		isAlternate?: boolean;
	}>(),
	{
		isAlternate: false,
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
	(e:  "activate-reference", payload: string): void;
	(e: "update:comment-parents", parents: string[]): void;
	(e: "post-comment" | "cancel" | "toggle-editor"): void;
}>();

const localCommentText = defineModel("newCommentText", {
	type: String,
	required: true,
});
</script>
<template>
	<div>
		<UiEditorAdvanced
			v-if="isAdvanced"
			v-model:new-comment-text="localCommentText"
			:new-comment-parents="props.newCommentParents"
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
			@update:comment-parents="emit('update:comment-parents', $event)"
			@toggle-editor="emit('toggle-editor')"
            @activate-reference="emit('activate-reference', $event)"
		/>
		<UiEditorSimple
			v-else
			v-model:new-comment-text="localCommentText"
			:new-comment-parents="props.newCommentParents"
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
			@update:comment-parents="emit('update:comment-parents', $event)"
			@toggle-editor="emit('toggle-editor')"
            @activate-reference="emit('activate-reference', $event)"
		/>
	</div>
</template>
