import type { PostgrestError } from "@supabase/supabase-js";
import type { Database } from "~/types/supabase";
import { buildCommentTree, flattenCommentNode, buildNodeMap } from "~/utils/commentTreeUtils";

type CommentInsert = Database["public"]["Tables"]["comments"]["Insert"];
type CommentUpdate = Partial<CommentInsert>;

type CommentLinkInsert =
	Database["public"]["Tables"]["comment_links"]["Insert"];

export interface RawComment {
	id: string;
	comment: string;
	created_at: string;
	user_id: string | null;
	profiles: {
		username: string;
		avatar_url: string;
	} | null;
}

export interface CommentLink {
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
		avatarUrl: string;
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

export type FullCommentNode = CommentNode & {
	showReplies: boolean | undefined;
	children: FullCommentNode[];
};

export type FlatCommentNode = FullCommentNode & {
    children: string[];
};

const comments = ref<CommentNode[]>([]);
const nodeMap = ref<Map<string, FlatCommentNode>>(new Map());
const threadId = ref<string>("");

export const useComments = (threadIdArg?: string) => {
    const supabase = useSupabaseClient<Database>();
    if (threadIdArg) threadId.value = threadIdArg;
    
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
			.eq("thread_id", threadId.value)
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
			.eq("thread_id", threadId.value);

		if (linksError) {
			console.error("Error fetching comment links:", linksError);
			throw linksError;
		}

		comments.value = buildCommentTree(rawComments!, rawLinks!);
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
						oldNodeMap.get(commentNode.id)?.showReplies ||
						undefined,
					children: [],
				};
				node.children = commentNode.children.map(recurse);

				return node;
			};

			nodeMap.value = buildNodeMap(comments.value.map(recurse));
		} catch (e) {
			console.error("Error loading comments:", e);
		}
	};

	// Turn an array of ids into refs
	const commentIdsToRefs = (ids: string[]) => {
		return ids.map((id) => {
			const node = nodeMap.value.get(id)!;
			return {
				id,
				author: node.author!,
				comment: {
					text: node.comment,
					createdAt: node.createdAt,
				},
			};
		});
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
					thread_id: threadId.value,
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

	const editComment = (comment: {
		id: string;
		comment: string;
		parentIds: string[];
	}) => {
		form.id = comment.id;
		form.comment = comment.comment;
		form.parentIds = comment.parentIds;
	};

	const submitCommentLink = async (parentId: string, childId: string) => {
		const newLink: CommentLinkInsert = {
			thread_id: threadId.value,
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
			.eq("thread_id", threadId.value);

		if (!deleteError) {
			await fetchComments();
		} else {
			error.value = deleteError;
		}
	};

	return {
		comments,
		form: { ...toRefs(form) },
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
		nodeMap: toRef(nodeMap),
		buildNodeMap,
		loadComments,
		commentIdsToRefs,
	};
};
