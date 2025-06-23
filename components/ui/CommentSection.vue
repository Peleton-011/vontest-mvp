<script lang="ts" setup>
import CommentItem from "~/components/ui/CommentItem.vue";

export type FullCommentNode = CommentNode & {
	showReplies: boolean | undefined;
	children: FullCommentNode[];
};

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

const router = useRouter();

const editingComment = ref<string>("");
const isTopLevelCommentOpen = ref(false);

const commentsTree = ref<FullCommentNode[]>([]);
const nodeMap = ref<Map<string, FullCommentNode>>(new Map());

// Helper: build a flat map id → CommentNode from the nested tree
const buildNodeMap = (roots: FullCommentNode[]) => {
	nodeMap.value.clear();
	const recurse = (commentNode: FullCommentNode) => {
		commentNode.children = commentNode.children.map(recurse);
		nodeMap.value.set(commentNode.id, commentNode);

		return commentNode;
	};
	console.log(roots);
	console.log(nodeMap.value);
	roots.forEach((root) => recurse(root));
};

// Load comments on mount (and whenever needed)
const loadComments = async () => {
	try {
		await fetchComments();
		const oldNodeMap = nodeMap.value;

		const recurse = (commentNode: CommentNode | FullCommentNode) => {
			const node: FullCommentNode = {
				...commentNode,
				showReplies:
					oldNodeMap.get(commentNode.id)?.showReplies || undefined,
				children: [],
			};
			node.children = commentNode.children.map(recurse);

			return node;
		};

		commentsTree.value = comments.value.map(recurse);

		buildNodeMap(commentsTree.value);
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
	if (!form.id) return;
	const node = nodeMap.value.get(form.id);
	if (!node) return;

	const oldParentIds = new Set(node.parentIds);
	const newParentIds = new Set(form.parentIds);

	const replyInserts = form.parentIds.filter((id) => !oldParentIds.has(id));
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
	console.log(nodeMap);
};

const handleUpdateShowReplies = (payload: { id: string; show: boolean }) => {
	const node = nodeMap.value.get(payload.id);
	if (!node) return;
	node.showReplies = payload.show;
};

const handleActivateReference = (commentId: string) => {
    console.log("Activating reference:", commentId);
    router.push({ hash: `#${commentId}` })
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
				@cancel-update="handleCancelUpdate"
				@toggle-replies="handleToggleReplies"
				@update:show-replies="handleUpdateShowReplies"
                @activate-reference="handleActivateReference"
			/>
		</div>
	</div>
</template>
