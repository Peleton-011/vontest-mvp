import type { Database } from "~/types/supabase";
import type { GameType } from "~/types/games";

type Group = Database["public"]["Tables"]["groups"]["Row"];
type GroupInsert = Database["public"]["Tables"]["groups"]["Insert"];
type GroupUpdate = Partial<GroupInsert>;

export const useGroups = () => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();

	const groups = ref<Group[]>([]);
	const error = ref<Error | null>(null);
	const loading = ref(false);

	// Form state for create/edit (using refs for two-way binding)
	const form = {
		id: ref<string | null>(null),
		name: ref(""),
		description: ref(""),
		avatar_url: ref(""),
		enabled_games: ref<GameType[]>([
			"would_you_rather",
			"hot_takes",
			"guess_who_said_it",
			"most_likely_to",
		]),
		notification_time: ref("09:00"),
		timezone: ref("UTC"),
	};

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
				name: form.name.value,
				description: form.description.value || null,
				avatar_url: form.avatar_url.value || "",
				created_by: user.value.id,
				settings: {
					enabled_games: form.enabled_games.value,
					notification_time: form.notification_time.value,
					timezone: form.timezone.value,
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
		if (!form.id.value) {
			error.value = new Error("No group ID specified");
			return false;
		}

		loading.value = true;

		try {
			const updateData: GroupUpdate = {
				name: form.name.value,
				description: form.description.value || null,
				avatar_url: form.avatar_url.value || "",
				settings: {
					enabled_games: form.enabled_games.value,
					notification_time: form.notification_time.value,
					timezone: form.timezone.value,
				},
			};

			const { error: updateError } = await supabase
				.from("groups")
				.update(updateData)
				.eq("id", form.id.value);

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
		form.id.value = group.id;
		form.name.value = group.name;
		form.description.value = group.description || "";
		form.avatar_url.value = group.avatar_url || "";

		// Parse settings from JSONB
		if (group.settings && typeof group.settings === "object") {
			const settings = group.settings as {
				enabled_games?: GameType[];
				notification_time?: string;
				timezone?: string;
			};

			form.enabled_games.value = (settings.enabled_games as GameType[]) || form.enabled_games.value;
			form.notification_time.value =
				settings.notification_time || form.notification_time.value;
			form.timezone.value = settings.timezone || form.timezone.value;
		}
	};

	/**
	 * Reset form to initial state
	 */
	const resetForm = () => {
		form.id.value = null;
		form.name.value = "";
		form.description.value = "";
		form.avatar_url.value = "";
		form.enabled_games.value = [
			"would_you_rather",
			"hot_takes",
			"guess_who_said_it",
			"most_likely_to",
		];
		form.notification_time.value = "09:00";
		form.timezone.value = "UTC";
	};

	/**
	 * Form validation
	 */
	const isFormValid = computed(() => {
		return (
			form.name.value.length >= 3 &&
			form.name.value.length <= 50 &&
			form.enabled_games.value.length > 0
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
		form,
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
