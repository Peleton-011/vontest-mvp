<script lang="ts" setup>
const props = defineProps<{
	newCommentText: string;
	newCommentParents: string[];
	nodeMap: Map<string, CommentNode>;
}>();

const emit = defineEmits<{
	(e: "update:comment-text", payload: string): void;
	(e: "update:comment-parents", parents: string[]): void;
	(e: "post-comment" | "cancel"): void;
}>();

const open = defineModel<boolean>("open");

const handleCancel = () => {
	open.value = false;
	emit("cancel");
};

const handlePostComment = () => {
	open.value = false;
	emit("post-comment");
};

watch(open, () => {
	// Set body pointer events to auto after 250ms
	setTimeout(() => {
		document.body.style.pointerEvents = "auto";
	}, 250);
});
</script>

<template>
	<UDrawer
		:modal="true"
		:overlay="false"
		:dismissible="false"
		should-scale-background
		:set-background-color-on-scale="false"
		v-model:open="open"
		inset
	>
		<template #content>
			<UiEditorGeneral
				:new-comment-text="props.newCommentText"
				:new-comment-parents="props.newCommentParents"
				:node-map="props.nodeMap"
				:is-alternate="true"
				@cancel="handleCancel"
				@post-comment="handlePostComment"
				@update:comment-text="emit('update:comment-text', $event)"
				@update:comment-parents="emit('update:comment-parents', $event)"
			/>
		</template>
	</UDrawer>
</template>
