<script lang="ts" setup>
const props = defineProps<{
	newCommentText: string;
	newCommentParents: string[];
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
</script>

<template>
	<UDrawer
		:overlay="false"
		:modal="false"
		should-scale-background
		:set-background-color-on-scale="false"
		v-model:open="open"
		inset
	>
		<template #content>
			<UiAdvancedEditor
				:new-comment-text="localCommentText"
				:new-comment-parents="newCommentParents"
				@cancel="handleCancel"
				@post-comment="handlePostComment"
				@update:comment-text="localCommentText = $event"
				@update:comment-parents="emit('update:comment-parents', $event)"
			/>
		</template>
	</UDrawer>
</template>
