import type { PostgrestError } from "@supabase/supabase-js";
import type { Database } from "~/types/supabase";

type Comment = Database["public"]["Tables"]["comments"]["Row"];
type CommentInsert = Database["public"]["Tables"]["comments"]["Insert"];
type CommentUpdate = Partial<CommentInsert>;

type CommentLinkInsert =
	Database["public"]["Tables"]["comment_links"]["Insert"];

interface RawComment {
	id: string;
	comment: string;
	created_at: string;
	user_id: string;
	profiles: {
		username: string;
		avatar_url: string | null;
	};
}

interface CommentLink {
	parent_id: string;
	child_id: string;
}

export interface CommentNode {
	id: string;
	comment: string;
	createdAt: Date;
	author: {
		id: string;
		username: string;
		avatarUrl: string | null;
	};
	// All direct parent IDs
	parentIds: string[];
	// The one “primary” parent under which this node will be nested (or null for a root)
	primaryParentId: string | null;
	// Any other parent IDs (secondary parents)
	secondaryParentIds: string[];
	// Children nested under this comment (only those for which this is the primary parent)
	children: CommentNode[];
	// How many comments reference this node as a secondary parent
	backChildrenCount: number;
	// IDs of comments that reference this node as a secondary parent
	backChildrenIds: string[];
}

export const useComments = (threadId: string) => {
	const supabase = useSupabaseClient<Database>();

	const comments = ref<CommentNode[]>([]);
	const loading = ref(false);
	const error = ref<Error | null>(null);

	const form = reactive({
		id: null as string | null,
		comment: "",
		parentIds: [] as string[],
	});

	const resetForm = () => {
		form.id = null;
		form.comment = "";
		form.parentIds = [];
	};

	/**
	 * Fetch all comments and links for a given thread, then build a DAG‐aware tree.
	 * Each comment will appear only once (under its “primary parent”), with secondary
	 * parents listed separately, and back‐references (backChildren) counted.
	 */
	const fetchComments = async () => {
		// 1) Fetch raw comments for the thread
		const { data: rawComments, error: commentsError } = (await supabase
			.from("comments")
			.select(
				`
        id,
        comment,
        created_at,
        user_id,
        profiles (
          username,
          avatar_url
        )
      `
			)
			.eq("thread_id", threadId)
			.order("created_at", { ascending: true })) as {
			data: RawComment[];
			error: PostgrestError | null;
		};

		if (commentsError) {
			console.error("Error fetching comments:", commentsError);
			throw commentsError;
		}

		// 2) Fetch all comment_links for the thread
		const { data: rawLinks, error: linksError } = await supabase
			.from("comment_links")
			.select("parent_id, child_id")
			.eq("thread_id", threadId);

		if (linksError) {
			console.error("Error fetching comment links:", linksError);
			throw linksError;
		}

		// 3) Build maps for easy lookups
		const commentMap = new Map<string, RawComment>();
		rawComments!.forEach((c: RawComment) => commentMap.set(c.id, c));

		// Build a map: commentId → all parentIds
		const parentsMap = new Map<string, string[]>();
		rawComments!.forEach((c: RawComment) => parentsMap.set(c.id, []));
		rawLinks!.forEach((link: CommentLink) => {
			if (!parentsMap.has(link.child_id)) {
				parentsMap.set(link.child_id, []);
			}
			parentsMap.get(link.child_id)!.push(link.parent_id);
		});

		// 4) Initialize a node map to build CommentNode objects
		const nodeMap = new Map<string, CommentNode>();

		// Preliminary pass: create a CommentNode for each raw comment, but don't assign children yet
		for (const raw of rawComments!) {
			const parentIds = parentsMap.get(raw.id) || [];

			nodeMap.set(raw.id, {
				id: raw.id,
				comment: raw.comment,
				createdAt: new Date(raw.created_at),
				author: {
					id: raw.user_id,
					username: raw.profiles.username,
					avatarUrl: raw.profiles.avatar_url,
				},
				parentIds,
				primaryParentId: null,
				secondaryParentIds: [],
				children: [],
				backChildrenCount: 0,
				backChildrenIds: [],
			});
		}

		// 5) Determine primary vs. secondary parents for each node
		//    Strategy: If a comment has multiple parents, choose as primary the parent
		//    with the earliest creation date. The rest become secondary.
		for (const node of nodeMap.values()) {
			if (node.parentIds.length === 0) {
				node.primaryParentId = null; // root
				node.secondaryParentIds = [];
				continue;
			}

			// Map parent IDs to their RawComment creation times
			const parentTuples: Array<{ id: string; createdAt: Date }> =
				node.parentIds
					.map((pid) => {
						const parentRaw = commentMap.get(pid);
						if (!parentRaw) {
							// This should not happen if referential integrity holds
							return null;
						}
						return {
							id: pid,
							createdAt: new Date(parentRaw.created_at),
						};
					})
					.filter(
						(x): x is { id: string; createdAt: Date } => x !== null
					);

			// Sort parents by creation date ascending → earliest first
			parentTuples.sort(
				(a, b) => a.createdAt.getTime() - b.createdAt.getTime()
			);

			// The first in the list is primary; the rest are secondary
			node.primaryParentId = parentTuples[0].id;
			node.secondaryParentIds = parentTuples.slice(1).map((t) => t.id);
		}

		// 6) Build children arrays under the chosen primary parents
		for (const node of nodeMap.values()) {
			if (node.primaryParentId) {
				const parentNode = nodeMap.get(node.primaryParentId);
				if (parentNode) {
					parentNode.children.push(node);
				}
			}
		}

		// 7) Compute back‐references: for each node, gather counts of nodes that list
		//    this node as a secondary parent
		for (const node of nodeMap.values()) {
			for (const secId of node.secondaryParentIds) {
				const secParentNode = nodeMap.get(secId);
				if (secParentNode) {
					secParentNode.backChildrenCount += 1;
					secParentNode.backChildrenIds.push(node.id);
				}
			}
		}

		// 8) Collect only the “root” nodes (those without a primary parent), sorted by creation date
		const roots = Array.from(nodeMap.values()).filter(
			(n) => n.primaryParentId === null
		);
		roots.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

		// Optionally, sort each subtree’s children recursively by createdAt
		const sortSubtree = (nodes: CommentNode[]) => {
			nodes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
			nodes.forEach((child) => {
				if (child.children.length > 0) {
					sortSubtree(child.children);
				}
			});
		};
		sortSubtree(roots);

		comments.value = roots;
	};

	const fetchComment = async (commentId: string) => {
		return comments.value.filter((comment) => comment.id === commentId);
	};

	/**
	 * Add a new comment under the given thread, with optional multiple parent replies.
	 * Returns the new comment ID.
	 */
	const submitComment = async (): Promise<string> => {
		loading.value = true;
		// Invoke the Supabase Edge Function which calls RLS‐protected RPC
		const { data, error } = await supabase.functions.invoke(
			"create-comment-with-links",
			{
				body: {
					thread_id: threadId,
					comment: form.comment,
					parent_ids: form.parentIds,
				},
			}
		);

		loading.value = false;

		if (error) {
			console.error("Edge function error:", error);
			throw error;
		}

		return data.comment_id;
	};

	const updateComment = async () => {
		if (!form.id) return;

		loading.value = true;

		const commentData: CommentUpdate = {
			comment: form.comment,
		};

		const { error: updateError } = await supabase
			.from("comments")
			.update(commentData)
			.eq("id", form.id);

		loading.value = false;

		if (!updateError) {
			resetForm();
			await fetchComments();
		} else {
			error.value = updateError;
		}
	};

	const deleteComment = async (id: string) => {
		const { error: deleteError } = await supabase
			.from("comments")
			.delete()
			.eq("id", id);

		if (!deleteError) {
			await fetchComments();
		} else {
			error.value = deleteError;
		}
	};

	const editComment = (comment: Comment) => {
		form.id = comment.id;
		form.comment = comment.comment;
	};

	const submitCommentLink = async (parentId: string, childId: string) => {
		const newLink: CommentLinkInsert = {
			thread_id: threadId,
			parent_id: parentId,
			child_id: childId,
		};

		const { data, error: insertError } = await supabase
			.from("comment_links")
			.insert(newLink)
			.select();

		if (!insertError) {
			await fetchComments();
			return data?.[0];
		} else {
			error.value = insertError;
		}
	};

	const deleteCommentLink = async (parentId: string, childId: string) => {
		const { error: deleteError } = await supabase
			.from("comment_links")
			.delete()
			.eq("parent_id", parentId)
			.eq("child_id", childId)
			.eq("thread_id", threadId);

		if (!deleteError) {
			await fetchComments();
		} else {
			error.value = deleteError;
		}
	};

	return {
		comments,
		form,
		loading,
		error,
		fetchComments,
		fetchComment,
		submitComment,
		updateComment,
		deleteComment,
		editComment,
		submitCommentLink,
		deleteCommentLink,
		resetForm,
	};
};
