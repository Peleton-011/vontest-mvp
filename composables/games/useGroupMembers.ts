import type { Database } from "~/types/supabase";

type GroupMember = Database["public"]["Tables"]["group_members"]["Row"];
type GroupMemberInsert =
	Database["public"]["Tables"]["group_members"]["Insert"];

interface MemberWithStats {
	user_id: string;
	username: string | null;
	avatar_url: string;
	role: string;
	joined_at: string;
	total_score: number;
	games_played: number;
}

export const useGroupMembers = (groupId?: Ref<string> | string) => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();

	const members = ref<MemberWithStats[]>([]);
	const error = ref<Error | null>(null);
	const loading = ref(false);

	// Get reactive group ID
	const currentGroupId = computed(() => {
		return typeof groupId === "string" ? groupId : groupId?.value || "";
	});

	/**
	 * Fetch all members for the group with their stats
	 * Uses the get_group_members_with_stats RPC function
	 */
	const fetchMembers = async () => {
		if (!currentGroupId.value) {
			error.value = new Error("No group ID provided");
			return;
		}

		loading.value = true;

		try {
			const { data, error: fetchError } = await supabase.rpc(
				"get_group_members_with_stats",
				{
					p_group_id: currentGroupId.value,
				}
			);

			if (fetchError) throw fetchError;
			members.value = (data as MemberWithStats[]) || [];
		} catch (err) {
			error.value = err as Error;
			console.error("Error fetching members:", err);
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Check if current user is admin of the group
	 */
	const isAdmin = computed(() => {
		if (!user.value) return false;

		const currentUserMember = members.value.find(
			(m) => m.user_id === user.value?.id
		);

		return currentUserMember?.role === "admin";
	});

	/**
	 * Check if current user is member of the group
	 */
	const isMember = computed(() => {
		if (!user.value) return false;

		return members.value.some((m) => m.user_id === user.value?.id);
	});

	/**
	 * Get current user's member data
	 */
	const currentMember = computed(() => {
		if (!user.value) return null;

		return members.value.find((m) => m.user_id === user.value?.id) || null;
	});

	/**
	 * Add a member to the group
	 * Only admins can add members
	 */
	const addMember = async (userId: string, role: "admin" | "member" = "member") => {
		if (!currentGroupId.value) {
			error.value = new Error("No group ID provided");
			return false;
		}

		loading.value = true;

		try {
			const newMember: GroupMemberInsert = {
				group_id: currentGroupId.value,
				user_id: userId,
				role: role,
			};

			const { error: insertError } = await supabase
				.from("group_members")
				.insert(newMember);

			if (insertError) throw insertError;

			// Refresh members list
			await fetchMembers();

			return true;
		} catch (err) {
			error.value = err as Error;
			console.error("Error adding member:", err);
			return false;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Remove a member from the group
	 * Admins can remove anyone, members can remove themselves
	 */
	const removeMember = async (userId: string) => {
		if (!currentGroupId.value) {
			error.value = new Error("No group ID provided");
			return false;
		}

		loading.value = true;

		try {
			const { error: deleteError } = await supabase
				.from("group_members")
				.delete()
				.eq("group_id", currentGroupId.value)
				.eq("user_id", userId);

			if (deleteError) throw deleteError;

			// Refresh members list
			await fetchMembers();

			return true;
		} catch (err) {
			error.value = err as Error;
			console.error("Error removing member:", err);
			return false;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Update a member's role
	 * Only admins can change roles
	 */
	const updateRole = async (userId: string, newRole: "admin" | "member") => {
		if (!currentGroupId.value) {
			error.value = new Error("No group ID provided");
			return false;
		}

		loading.value = true;

		try {
			const { error: updateError } = await supabase
				.from("group_members")
				.update({ role: newRole })
				.eq("group_id", currentGroupId.value)
				.eq("user_id", userId);

			if (updateError) throw updateError;

			// Refresh members list
			await fetchMembers();

			return true;
		} catch (err) {
			error.value = err as Error;
			console.error("Error updating role:", err);
			return false;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Leave the group (remove self)
	 */
	const leaveGroup = async () => {
		if (!user.value) {
			error.value = new Error("User not authenticated");
			return false;
		}

		return await removeMember(user.value.id);
	};

	/**
	 * Get member count
	 */
	const memberCount = computed(() => members.value.length);

	/**
	 * Get admin count
	 */
	const adminCount = computed(() => {
		return members.value.filter((m) => m.role === "admin").length;
	});

	// Auto-fetch members if group ID is provided
	if (currentGroupId.value) {
		fetchMembers();
	}

	// Watch for group ID changes
	if (typeof groupId !== "string") {
		watch(currentGroupId, (newId) => {
			if (newId) {
				fetchMembers();
			}
		});
	}

	return {
		// State
		members,
		loading,
		error,

		// Computed
		isAdmin,
		isMember,
		currentMember,
		memberCount,
		adminCount,

		// Actions
		fetchMembers,
		addMember,
		removeMember,
		updateRole,
		leaveGroup,
	};
};
