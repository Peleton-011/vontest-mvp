import type { Database } from "~/types/supabase";

export const useProfile = () => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();

	const profile = ref<Database["public"]["Tables"]["profiles"]["Row"] | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);

	const fetchProfile = async () => {
		if (!user.value) return;

		loading.value = true;
		error.value = null;

		try {
			const { data, error: fetchError } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", user.value.id)
				.single();

			if (fetchError) throw fetchError;
			profile.value = data;
		} catch (e: any) {
			error.value = e.message || "Failed to fetch profile";
			console.error(e);
		} finally {
			loading.value = false;
		}
	};

	return { profile, loading, error, fetchProfile };
};
