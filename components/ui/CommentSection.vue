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
	form,
	resetForm,
} = useComments(props.threadId);

const editingComment = ref<string>("");
const isTopLevelCommentOpen = ref(false);

const commentsTree = ref<CommentNode[]>([]);
const nodeMap = ref<Map<string, CommentNode>>(new Map());

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
	if (!form.comment.trim()) return;
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
	console.log("Editing comment:", commentId);
	const node = nodeMap.value.get(commentId);
	console.log(node);
	if (!node) return;
	editingComment.value = commentId;
	const {
		id,
		comment,
		createdAt,
		author: { id: userId },
	} = node;
	editComment({
		id,
		comment,
		created_at: createdAt.toISOString(),
		user_id: userId,
		thread_id: props.threadId,
	});
};

// Handler: update a comment
const handleUpdateComment = async () => {
	await updateComment();
	await loadComments();
	editingComment.value = "";
	// console.log("Updating comment:", commentId);
};

watch(commentsTree, () => {
	console.log("Comments updated:", commentsTree.value);
	console.log(buildNodeMap(commentsTree.value));
});
</script>
<template>
	<div>
		<div class="mb-4 flex justify-between">
			<h3 class="text-xl font-semibold mb-2">Discussion</h3>
			<UButton
				label="Join the Discussion"
				variant="subtle"
				trailing-icon="i-lucide-chevron-down"
				@click="isTopLevelCommentOpen = !isTopLevelCommentOpen"
			/>
		</div>

		<!-- New top-level comment box -->
		<UCollapsible v-model:open="isTopLevelCommentOpen" class="mb-4">
			<template #content>
				<div class="mb-4">
					<textarea
						v-model="form.comment"
						class="w-full p-2 rounded bg-gray-800"
						rows="3"
						placeholder="Write your reply..."
					/>
					<div class="text-right mt-2">
						<UButton
							label="Post Comment"
							:disabled="!form.comment?.trim()"
							@click="
								postComment();
								isTopLevelCommentOpen = false;
							"
						/>
						<UButton
							label="Cancel"
							variant="subtle"
							@click="
								resetForm();
								isTopLevelCommentOpen = false;
							"
						/>
					</div>
				</div>
			</template>
		</UCollapsible>

		<!-- Recursive Comments Tree -->
		<div class="space-y-4">
			<CommentItem
				v-for="node in commentsTree"
				:key="node.id"
				:node="node"
				:depth="0"
				:node-map="nodeMap"
				:new-comment-text="form.comment"
				:new-comment-parents="form.parentIds"
				:editing-comment="editingComment"
				@update:comment-text="form.comment = $event"
				@update:comment-parents="form.parentIds = $event"
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
