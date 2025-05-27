export const useComments = () => {
	const supabase = useSupabaseClient();

	const addComment = async (
		threadId: string,
		text: string,
		parentIds: string[] = []
	) => {
		const { data, error } = await supabase.functions.invoke(
			"create-comment-with-links",
			{
				body: {
					thread_id: threadId,
					comment: text,
					parent_ids: parentIds,
				},
			}
		);

		if (error) {
			console.error("Edge function error:", error);
			throw error;
		}

		// data should be { comment_id: "<new-uuid>" }
		return (data as { comment_id: string }).comment_id;
	};

	const fetchComments = async (threadId: string) => {
		const { data, error } = await supabase
			.from("comments")
			.select(
				`
            comment,
            created_at,
            users (user_metadata)
          `
			)
			.eq("thread_id", threadId)
			.order("created_at", { ascending: true });
		if (error) throw error;
		return data;
	};

	return { fetchComments, addComment };
};
