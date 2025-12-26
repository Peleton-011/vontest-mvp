import type {
	RawComment,
	CommentLink,
	FullCommentNode,
	FlatCommentNode,
} from "~/composables/useComments";

/**
 * Builds a DAG-aware comment tree from raw comments and links.
 * Returns an array of FullCommentNode roots sorted by creation date.
 */
export function buildCommentTree(
	rawComments: RawComment[],
	rawLinks: CommentLink[]
): FullCommentNode[] {
	// Build lookup maps
	const commentMap = new Map<string, RawComment>();
	rawComments.forEach((c) => commentMap.set(c.id, c));

	const parentsMap = new Map<string, string[]>();
	rawComments.forEach((c) => parentsMap.set(c.id, []));
	rawLinks.forEach((link) => {
		if (!parentsMap.has(link.child_id)) {
			parentsMap.set(link.child_id, []);
		}
		parentsMap.get(link.child_id)!.push(link.parent_id);
	});

	// Build FullCommentNode map
	const nodeMap = new Map<string, FullCommentNode>();

	for (const raw of rawComments) {
		const parentIds = parentsMap.get(raw.id) || [];

		// Handle system messages (NULL user_id/profiles)
		const isSystemMessage = !raw.user_id || !raw.profiles;

		nodeMap.set(raw.id, {
			id: raw.id,
			comment: raw.comment,
			createdAt: new Date(raw.created_at),
			messageType: raw.message_type,
			author: {
				id: raw.user_id || 'system',
				username: isSystemMessage ? 'System' : raw.profiles!.username,
				avatarUrl: isSystemMessage ? '' : raw.profiles!.avatar_url,
			},
			parentIds,
			primaryParentId: null,
			secondaryParentIds: [],
			children: [],
			backChildrenCount: 0,
			backChildrenIds: [],
			showReplies: undefined,
		});
	}

	// Determine primary vs. secondary parents
	for (const node of nodeMap.values()) {
		if (node.parentIds.length === 0) {
			node.primaryParentId = null; // root
			node.secondaryParentIds = [];
			continue;
		}

		const parentTuples: Array<{ id: string; createdAt: Date }> =
			node.parentIds
				.map((pid) => {
					const parentRaw = commentMap.get(pid);
					if (!parentRaw) return null;
					return {
						id: pid,
						createdAt: new Date(parentRaw.created_at),
					};
				})
				.filter(
					(x): x is { id: string; createdAt: Date } => x !== null
				);

		parentTuples.sort(
			(a, b) => a.createdAt.getTime() - b.createdAt.getTime()
		);

		node.primaryParentId = parentTuples[0].id;
		node.secondaryParentIds = parentTuples.slice(1).map((t) => t.id);
	}

	// Assign children to primary parents
	for (const node of nodeMap.values()) {
		if (node.primaryParentId) {
			const parentNode = nodeMap.get(node.primaryParentId);
			if (parentNode) {
				parentNode.children.push(node);
			}
		}
	}

	// Compute back-references (secondary parents)
	for (const node of nodeMap.values()) {
		for (const secId of node.secondaryParentIds) {
			const secParentNode = nodeMap.get(secId);
			if (secParentNode) {
				secParentNode.backChildrenCount += 1;
				secParentNode.backChildrenIds.push(node.id);
			}
		}
	}

	// Collect root nodes
	const roots = Array.from(nodeMap.values()).filter(
		(n) => n.primaryParentId === null
	);

	// Recursive sort by createdAt
	const sortSubtree = (nodes: FullCommentNode[]) => {
		nodes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
		nodes.forEach((child) => {
			if (child.children.length > 0) {
				sortSubtree(child.children);
			}
		});
	};

	sortSubtree(roots);

	return roots;
}

export function flattenCommentNode(node: FullCommentNode): FlatCommentNode {
	return {
		...node,
		children: node.children.map((child) => child.id),
	} as FlatCommentNode;
}

// Helper: build a flat map id → CommentNode from the nested tree
export function buildNodeMap(
	roots: FullCommentNode[]
): Map<string, FlatCommentNode> {
	const nodeMap = new Map<string, FlatCommentNode>();
	const recurse = (commentNode: FullCommentNode) => {
		commentNode.children = commentNode.children.map(recurse);
		nodeMap.set(commentNode.id, flattenCommentNode(commentNode));

		return commentNode;
	};
	roots.forEach((root) => recurse(root));
	return nodeMap;
}
