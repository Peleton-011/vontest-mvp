<script lang="ts" setup>
import { useRoute, useRouter } from "vue-router";
import type { Database } from "~/types/supabase";
import CommentItem from "~/components/ui/CommentItem.vue";
import OptionsDropdown from "~/components/ui/OptionsDropdown.vue";
import DOMPurify from "dompurify";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

const route = useRoute();
const router = useRouter();
const user = useSupabaseUser();

const proposalId = route.params.id as string;
const vontestId = route.params.vontestId as string;

const { fetchProposal } = useProposals(vontestId);
const proposal = ref<Proposal | null>(null);

onMounted(async () => {
	try {
		const fetched = await fetchProposal(proposalId);
		proposal.value = fetched || null;
	} catch (e) {
		console.error("Error fetching proposal:", e);
	}
});

// Comments state (DAG‐aware tree)
const {
	fetchComments,
	submitComment,
	deleteComment,
	editComment,
	updateComment,
	comments,
	form,
	resetForm,
} = useComments(proposalId);
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
    console.log(node)
	if (!node) return;
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
		thread_id: proposalId,
	});
};

// Handler: update a comment
const handleUpdateComment = async () => {
	await updateComment();
	await loadComments();
	// console.log("Updating comment:", commentId);
};

// Navigation helper
const navigateTo = (path: string) => router.push(path);

watch(commentsTree, () => {
	console.log("Comments updated:", commentsTree.value);
	console.log(buildNodeMap(commentsTree.value));
});
</script>

<template>
	<section
		v-if="proposal"
		class="max-w-4xl mx-auto px-4 py-8 text-white space-y-6"
	>
		<UCard v-if="proposal">
			<template #header>
				<div class="flex items-center justify-between">
					<h1 class="text-2xl font-bold">{{ proposal.title }}</h1>
					<OptionsDropdown
						v-if="proposal.created_by === user?.id"
						@edit="navigateTo(`/proposals/\${proposalId}/edit`)"
						@delete="navigateTo(`/proposals/\${proposalId}/delete`)"
					/>
				</div>
			</template>
			<p
				v-if="proposal.description"
				class="text-gray-400 markdown-body ql-editor"
				:v-html="DOMPurify.sanitize(proposal.description)"
			/>
			<template #footer>
				<div class="flex justify-between items-center gap-2">
					<small class="text-gray-500">
						Created on
						{{
							new Date(proposal.created_at ?? "").toLocaleString()
						}}
					</small>
					<div class="w-1/3 flex gap-2">
						<UButton
							label="Respond"
							variant="subtle"
							:disabled="true"
							block
							icon="i-lucide-message-circle"
						/>
						<UButton
							label="Vote"
							variant="subtle"
							block
							icon="i-lucide-vote"
							@click="
								navigateTo('/vontests/' + vontestId + '/vote')
							"
						/>
					</div>
				</div>
			</template>
		</UCard>

		<!-- Comments section -->
		<div>
			<h3 class="text-xl font-semibold mb-2">Discussion</h3>

			<!-- New top-level comment box -->
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
						@click="postComment"
					/>
				</div>
			</div>

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
					@update:comment-text="form.comment = $event"
					@update:comment-parents="form.parentIds = $event"
					@post-comment="postComment"
					@delete-comment="handleDeleteComment"
					@edit-comment="handleEditComment"
					@post-update="handleUpdateComment"
				/>
			</div>
		</div>
	</section>
</template>
