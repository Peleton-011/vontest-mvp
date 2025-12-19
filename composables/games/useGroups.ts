import type { Database } from "~/types/supabase";

type Group = Database["public"]["Tables"]["groups"]["Row"];
type GroupInsert = Database["public"]["Tables"]["groups"]["Insert"];
type GroupUpdate = Partial<GroupInsert>;

export const useGroups = () => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();

	const groups = ref<Group[]>([]);
	const error = ref<Error | null>(null);
	const loading = ref(false);

	// Form state for create/edit
	const form = reactive({
		id: null as string | null,
		name: "",
		description: "",
		avatar_url: "",
		enabled_games: [
			"would_you_rather",
			"hot_takes",
			"guess_who_said_it",
			"most_likely_to",
		] as string[],
		notification_time: "09:00",
		timezone: "UTC",
	});

	/**
	 * Fetch all groups for the current user
	 * Uses the get_user_groups RPC function
	 */
	const fetchGroups = async () => {
		if (!user.value) {
			error.value = new Error("User not authenticated");
			return;
		}

		loading.value = true;
		try {
			const { data, error: fetchError } = await supabase.rpc(
				"get_user_groups",
				{
					p_user_id: user.value.id,
				}
			);

			if (fetchError) throw fetchError;
			groups.value = (data as Group[]) || [];
		} catch (err) {
			error.value = err as Error;
			console.error("Error fetching groups:", err);
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Fetch a single group by ID
	 */
	const fetchGroup = async (groupId: string) => {
		const { data, error: fetchError } = await supabase
			.from("groups")
			.select("*")
			.eq("id", groupId)
			.single();

		if (fetchError) {
			error.value = fetchError;
			return null;
		}

		return data;
	};

	/**
	 * Create a new group
	 * The creator is automatically added as admin via database trigger
	 */
	const createGroup = async () => {
		if (!user.value) {
			error.value = new Error("User not authenticated");
			return null;
		}

		loading.value = true;

		try {
			const newGroup: GroupInsert = {
				name: form.name,
				description: form.description || null,
				avatar_url: form.avatar_url || "",
				created_by: user.value.id,
				settings: {
					enabled_games: form.enabled_games,
					notification_time: form.notification_time,
					timezone: form.timezone,
				},
			};

			const { data, error: insertError } = await supabase
				.from("groups")
				.insert(newGroup)
				.select()
				.single();

			if (insertError) throw insertError;

			// Refresh groups list
			await fetchGroups();

			// Reset form
			resetForm();

			return data;
		} catch (err) {
			error.value = err as Error;
			console.error("Error creating group:", err);
			return null;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Update an existing group
	 */
	const updateGroup = async () => {
		if (!form.id) {
			error.value = new Error("No group ID specified");
			return false;
		}

		loading.value = true;

		try {
			const updateData: GroupUpdate = {
				name: form.name,
				description: form.description || null,
				avatar_url: form.avatar_url || "",
				settings: {
					enabled_games: form.enabled_games,
					notification_time: form.notification_time,
					timezone: form.timezone,
				},
			};

			const { error: updateError } = await supabase
				.from("groups")
				.update(updateData)
				.eq("id", form.id);

			if (updateError) throw updateError;

			// Refresh groups list
			await fetchGroups();

			// Reset form
			resetForm();

			return true;
		} catch (err) {
			error.value = err as Error;
			console.error("Error updating group:", err);
			return false;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Delete a group
	 */
	const deleteGroup = async (id: string) => {
		loading.value = true;

		try {
			const { error: deleteError } = await supabase
				.from("groups")
				.delete()
				.eq("id", id);

			if (deleteError) throw deleteError;

			// Refresh groups list
			await fetchGroups();

			return true;
		} catch (err) {
			error.value = err as Error;
			console.error("Error deleting group:", err);
			return false;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Load a group into the form for editing
	 */
	const editGroup = (group: Group) => {
		form.id = group.id;
		form.name = group.name;
		form.description = group.description || "";
		form.avatar_url = group.avatar_url || "";

		// Parse settings from JSONB
		if (group.settings && typeof group.settings === "object") {
			const settings = group.settings as {
				enabled_games?: string[];
				notification_time?: string;
				timezone?: string;
			};

			form.enabled_games = settings.enabled_games || form.enabled_games;
			form.notification_time =
				settings.notification_time || form.notification_time;
			form.timezone = settings.timezone || form.timezone;
		}
	};

	/**
	 * Reset form to initial state
	 */
	const resetForm = () => {
		form.id = null;
		form.name = "";
		form.description = "";
		form.avatar_url = "";
		form.enabled_games = [
			"would_you_rather",
			"hot_takes",
			"guess_who_said_it",
			"most_likely_to",
		];
		form.notification_time = "09:00";
		form.timezone = "UTC";
	};

	/**
	 * Form validation
	 */
	const isFormValid = computed(() => {
		return (
			form.name.length >= 3 &&
			form.name.length <= 50 &&
			form.enabled_games.length > 0
		);
	});

	// Auto-fetch groups on mount
	if (user.value) {
		fetchGroups();
	}

	return {
		// State
		groups,
		loading,
		error,

		// Form
		form: { ...toRefs(form) },
		isFormValid,

		// Actions
		fetchGroups,
		fetchGroup,
		createGroup,
		updateGroup,
		deleteGroup,
		editGroup,
		resetForm,
	};
};
