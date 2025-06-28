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
                :new-comment-text="newCommentText"
                :new-comment-parents="newCommentParents"
                :node-map="nodeMap"
                :is-advanced="isAdvanced"
                @cancel="handleCancel"
                @post-comment="handlePostComment"
                @update:comment-text="emit('update:comment-text', $event)"
                @update:comment-parents="emit('update:comment-parents', $event)"
            />
		</template>
	</UDrawer>
</template>
