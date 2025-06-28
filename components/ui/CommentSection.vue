<script lang="ts" setup>
import CommentItem from "~/components/ui/CommentItem.vue";

const props = defineProps<{
	threadId: string;
}>();

const {
	fetchComments,
	submitComment,
	deleteComment,
	editComment,
	updateComment,
	comments,
	submitCommentLink,
	deleteCommentLink,
	form,
	resetForm,
} = useComments(props.threadId);

const { settings, fetchSettings } = useUserSettings();
onMounted(fetchSettings);

const isAdvanced = computed(() => {
	return settings?.value?.defaultEditor === "advanced";
});

const editingComment = ref<string>("");
const isTopLevelComment = ref(false);

const isAternateEditorOpen = ref(false);

const commentsTree = ref<CommentNode[]>([]);
const nodeMap = ref<Map<string, CommentNode>>(new Map());

const isTopLevelCommentOpen = computed(() => {
	return isTopLevelComment.value && !isAternateEditorOpen.value;
});

// Helper: build a flat map id → CommentNode from the nested tree
const buildNodeMap = (roots: CommentNode[]) => {
	nodeMap.value.clear();
	const recurse = (node: CommentNode) => {
		nodeMap.value.set(node.id, node);
		node.children.forEach((child) => recurse(child));
	};
	roots.forEach((root) => recurse(root));
};

// Load comments on mount (and whenever needed)
const loadComments = async () => {
	try {
		await fetchComments();

		commentsTree.value = comments.value;
		buildNodeMap(comments.value);
	} catch (e) {
		console.error("Error loading comments:", e);
	}
};

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

// watch(commentsTree, () => {
// console.log("Comments updated:", commentsTree.value);
// console.log(buildNodeMap(commentsTree.value));
// });
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
					:new-comment-text="form.comment.value"
					:new-comment-parents="form.parentIds.value"
					:node-map="nodeMap"
					:is-advanced="isAdvanced"
					@cancel="
						isTopLevelComment = false;
						resetForm();
					"
					@post-comment="
						isTopLevelComment = false;
						postComment();
					"
					@update:comment-text="form.comment.value = $event"
					@update:comment-parents="form.parentIds.value = $event"
				/>
			</template>
		</UCollapsible>

		<UButton
			:label="isAternateEditorOpen ? 'Close Editor' : 'Advanced Editor'"
			color="neutral"
			variant="subtle"
			trailing-icon="i-lucide-chevron-up"
			@click="isAternateEditorOpen = !isAternateEditorOpen"
		/>

		<UiEditorDrawer
			v-model:open="isAternateEditorOpen"
			:new-comment-text="form.comment.value"
			:new-comment-parents="form.parentIds.value"
			:node-map="nodeMap"
			:is-advanced="isAdvanced"
			@update:comment-text="form.comment.value = $event"
			@update:comment-parents="form.parentIds.value = $event"
			@post-comment="postComment"
			@cancel="resetForm"
		/>

		<!-- Recursive Comments Tree -->
		<div class="space-y-4">
			<CommentItem
				v-for="node in commentsTree"
				:key="node.id"
				:node="node"
				:depth="0"
				:node-map="nodeMap"
				:new-comment-text="form.comment.value"
				:new-comment-parents="form.parentIds.value"
				:editing-comment="editingComment"
				:is-advanced="isAternateEditorOpen"
				@update:comment-text="form.comment.value = $event"
				@update:comment-parents="form.parentIds.value = $event"
				@post-comment="postComment"
				@delete-comment="handleDeleteComment"
				@edit-comment="handleEditComment"
				@post-update="handleUpdateComment"
				@cancel-update="
					editingComment = '';
					resetForm();
				"
			/>
		</div>
	</div>
</template>
