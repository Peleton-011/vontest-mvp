import type { Database } from "~/types/supabase";

type Thread = Database["public"]["Tables"]["threads"]["Row"];

export const useThread = () => {
	const supabase = useSupabaseClient<Database>();

	const thread = ref<Thread | null>(null);
	const loading = ref(false);
	const error = ref<Error | null>(null);

	/**
	 * Fetch a single thread by reference ID and type.
	 * E.g., get the thread for a given proposal or vontest.
	 */
	const fetchThread = async (
		referenceId: string,
		type: "vontest" | "proposal"
	) => {
		loading.value = true;
		error.value = null;

		const { data, error: fetchError } = await supabase
			.from("threads")
			.select("id, reference_id, type")
			.eq("reference_id", referenceId)
			.eq("type", type)
			.single();

		loading.value = false;

		if (fetchError) {
			console.error("Error fetching thread:", fetchError);
			error.value = fetchError;
			thread.value = null;
			return null;
		}

		thread.value = data;
		return data;
	};

	return {
		thread,
		loading,
		error,
		fetchThread,
	};
};
