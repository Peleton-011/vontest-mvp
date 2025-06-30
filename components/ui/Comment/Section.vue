<script lang="ts" setup>
import type { FullCommentNode } from "~/composables/useComments";

const props = defineProps<{
	threadId: string;
}>();

const {
	submitComment,
	deleteComment,
	editComment,
	updateComment,
	submitCommentLink,
	deleteCommentLink,
	form,
	resetForm,
    nodeMap,
    loadComments,
    commentsTree
} = useComments(props.threadId);

const router = useRouter();

const editingComment = ref<string>("");
const isTopLevelComment = ref(false);

const isAlternateEditorOpen = ref(false);

const isTopLevelCommentOpen = computed(() => {
	return (
		isTopLevelComment.value &&
		!isAlternateEditorOpen.value &&
		!form.parentIds.value.length
	);
});


onMounted(loadComments);

// Handler: post a new comment
const postComment = async () => {
	if (!form.comment.value.trim()) return;
	try {
		await submitComment();
		resetForm();
		await loadComments();
	} catch (e: unknown) {
		if (e instanceof Error) {
			console.error("Failed to post comment:", e.message);
		} else {
			console.error("An unknown error occurred:", e);
		}
	}
};

// Handler: delete a comment
const handleDeleteComment = async (commentId: string) => {
	await deleteComment(commentId);
	await loadComments();
	// console.log("Deleted comment:", commentId);
};

// Handler: edit a comment
const handleEditComment = (commentId: string) => {
	// console.log("Editing comment:", commentId);
	const node = nodeMap.value.get(commentId);
	// console.log(node);
	if (!node) return;
	editingComment.value = commentId;
	const { id, comment, parentIds } = node;
	editComment({
		id,
		comment,
		parentIds,
	});
};

// Handler: cancel a comment update
const handleCancelUpdate = () => {
	editingComment.value = "";
	resetForm();
};

// Handler: update a comment
const handleUpdateComment = async () => {
	if (!form.id.value) return;
	const node = nodeMap.value.get(form.id.value);
	if (!node) return;

	const oldParentIds = new Set(node.parentIds);
	const newParentIds = new Set(form.parentIds.value);

	const replyInserts = form.parentIds.value.filter(
		(id) => !oldParentIds.has(id)
	);
	const replyDeletes = node.parentIds.filter((id) => !newParentIds.has(id));

	await Promise.all(replyInserts.map((id) => submitCommentLink(id, node.id)));
	await Promise.all(replyDeletes.map((id) => deleteCommentLink(id, node.id)));

	await updateComment();

	await loadComments();
	editingComment.value = "";
	// console.log("Updating comment:", commentId);
};

// Handler: toggle replies
const handleToggleReplies = (commentId: string) => {
	const node = nodeMap.value.get(commentId);
	if (!node) return;
	node.showReplies =
		typeof node.showReplies === "undefined" ? true : !node.showReplies;
	// Toggle visibility for another level of children
	node.children.forEach(({ id }) => {
		const child = nodeMap.value.get(id);
		if (!child) return;
		child.showReplies = node.showReplies;
	});
	// console.log(nodeMap);
};

const handleUpdateShowReplies = (payload: { id: string; show: boolean }) => {
	const node = nodeMap.value.get(payload.id);
	if (!node) return;
	node.showReplies = payload.show;
};

const handleActivateReference = (commentId: string) => {
	// console.log("Activating reference:", commentId);
	router.push({ hash: `#${commentId}` });
	const node = nodeMap.value.get(commentId);
	if (!node) return;
	node.showReplies = true;
	// Recursively show replies for all parents of this comment
	let parent = nodeMap.value.get(node.parentIds[0]);
	while (parent) {
		parent.showReplies = true;
		parent = nodeMap.value.get(parent.parentIds[0]);
	}
};

</script>
<template>
	<div>
		<div class="mb-4 flex justify-between">
			<h3 class="text-xl font-semibold mb-2">Discussion</h3>
			<UButton
				label="Join the Discussion"
				variant="subtle"
				trailing-icon="i-lucide-chevron-down"
				@click="isTopLevelComment = !isTopLevelComment"
			/>
		</div>

		<!-- New top-level comment box -->
		<UCollapsible v-model:open="isTopLevelCommentOpen" class="mb-4">
			<template #content>
				<UiEditorGeneral
					v-model:new-comment-text="form.comment.value"
					:new-comment-parents="form.parentIds.value"
					@cancel="
						isTopLevelComment = false;
						resetForm();
					"
					@post-comment="
						isTopLevelComment = false;
						postComment();
					"
					@update:comment-parents="form.parentIds.value = $event"
					@toggle-editor="
						isAlternateEditorOpen = !isAlternateEditorOpen
					"
				/>
			</template>
		</UCollapsible>

        <!-- Alternate comment editor -->
		<UiEditorDrawer
			v-model:open="isAlternateEditorOpen"
			v-model:new-comment-text="form.comment.value"
			v-model:new-comment-parents="form.parentIds.value"
			@post-comment="postComment"
			@cancel="resetForm"
		/>

		<!-- Recursive Comments Tree -->
		<div class="space-y-4">
			<UiCommentItem
				v-for="node in commentsTree"
				:key="node.id"
				v-model:new-comment-text="form.comment.value"
				v-model:new-comment-parents="form.parentIds.value"
				v-model:is-alternate="isAlternateEditorOpen"
				:node="node"
				:depth="0"
				:editing-comment="editingComment"
				@post-comment="postComment"
				@delete-comment="handleDeleteComment"
				@edit-comment="handleEditComment"
				@post-update="handleUpdateComment"
				@cancel-update="handleCancelUpdate"
				@toggle-replies="handleToggleReplies"
				@update:show-replies="handleUpdateShowReplies"
				@activate-reference="handleActivateReference"
			/>
		</div>
	</div>
</template>
