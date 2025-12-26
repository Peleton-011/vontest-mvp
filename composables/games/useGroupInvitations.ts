import type { Database } from "~/types/supabase";

type GroupInvitation =
	Database["public"]["Tables"]["group_invitations"]["Row"];
type GroupInvitationInsert =
	Database["public"]["Tables"]["group_invitations"]["Insert"];

interface InvitationWithDetails extends GroupInvitation {
	group?: {
		name: string;
		avatar_url: string;
	};
	inviter?: {
		username: string | null;
		avatar_url: string;
	};
}

export const useGroupInvitations = (groupId?: Ref<string> | string) => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();

	const invitations = ref<InvitationWithDetails[]>([]);
	const pendingInvitations = ref<InvitationWithDetails[]>([]);
	const error = ref<Error | null>(null);
	const loading = ref(false);

	// Get reactive group ID
	const currentGroupId = computed(() => {
		return typeof groupId === "string" ? groupId : groupId?.value || "";
	});

	/**
	 * Fetch invitations for a specific group
	 */
	const fetchGroupInvitations = async () => {
		if (!currentGroupId.value) {
			error.value = new Error("No group ID provided");
			return;
		}

		loading.value = true;

		try {
			const { data, error: fetchError } = await supabase
				.from("group_invitations")
				.select(
					`
          *,
          profiles:invited_user_id (
            username,
            avatar_url
          )
        `
				)
				.eq("group_id", currentGroupId.value)
				.order("created_at", { ascending: false });

			if (fetchError) throw fetchError;
			invitations.value = (data as InvitationWithDetails[]) || [];
		} catch (err) {
			error.value = err as Error;
			console.error("Error fetching group invitations:", err);
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Fetch pending invitations for the current user (across all groups)
	 */
	const fetchPendingInvitations = async () => {
		if (!user.value) {
			error.value = new Error("User not authenticated");
			return;
		}

		loading.value = true;

		try {
			const { data, error: fetchError } = await supabase
				.from("group_invitations")
				.select(
					`
          *,
          groups (
            name,
            avatar_url
          ),
          profiles:invited_by (
            username,
            avatar_url
          )
        `
				)
				.eq("invited_user_id", user.value.id)
				.eq("status", "pending")
				.gt("expires_at", new Date().toISOString())
				.order("created_at", { ascending: false });

			if (fetchError) throw fetchError;
			pendingInvitations.value = (data as InvitationWithDetails[]) || [];
		} catch (err) {
			error.value = err as Error;
			console.error("Error fetching pending invitations:", err);
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Send an invitation to join the group
	 */
	const sendInvitation = async (
		invitedUserId?: string,
		email?: string
	): Promise<boolean> => {
		if (!currentGroupId.value) {
			error.value = new Error("No group ID provided");
			return false;
		}

		if (!user.value) {
			error.value = new Error("User not authenticated");
			return false;
		}

		if (!invitedUserId && !email) {
			error.value = new Error(
				"Either invited user ID or email must be provided"
			);
			return false;
		}

		loading.value = true;

		try {
			const newInvitation: GroupInvitationInsert = {
				group_id: currentGroupId.value,
				invited_by: user.value.id,
				invited_user_id: invitedUserId || null,
				email: email || null,
				status: "pending",
			};

			const { error: insertError } = await supabase
				.from("group_invitations")
				.insert(newInvitation);

			if (insertError) throw insertError;

			// Refresh invitations list
			await fetchGroupInvitations();

			return true;
		} catch (err) {
			error.value = err as Error;
			console.error("Error sending invitation:", err);
			return false;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Accept an invitation
	 * Uses the accept_group_invitation RPC function
	 */
	const acceptInvitation = async (invitationId: string): Promise<boolean> => {
		if (!user.value) {
			error.value = new Error("User not authenticated");
			return false;
		}

		loading.value = true;

		try {
			const { error: acceptError } = await supabase.rpc(
				"accept_group_invitation",
				{
					invitation_id: invitationId,
				}
			);

			if (acceptError) throw acceptError;

			// Refresh pending invitations
			await fetchPendingInvitations();

			return true;
		} catch (err) {
			error.value = err as Error;
			console.error("Error accepting invitation:", err);
			return false;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Decline an invitation
	 */
	const declineInvitation = async (invitationId: string): Promise<boolean> => {
		if (!user.value) {
			error.value = new Error("User not authenticated");
			return false;
		}

		loading.value = true;

		try {
			const { error: updateError } = await supabase
				.from("group_invitations")
				.update({ status: "declined" })
				.eq("id", invitationId)
				.eq("invited_user_id", user.value.id);

			if (updateError) throw updateError;

			// Refresh pending invitations
			await fetchPendingInvitations();

			return true;
		} catch (err) {
			error.value = err as Error;
			console.error("Error declining invitation:", err);
			return false;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Cancel an invitation (for inviters)
	 */
	const cancelInvitation = async (invitationId: string): Promise<boolean> => {
		loading.value = true;

		try {
			const { error: deleteError } = await supabase
				.from("group_invitations")
				.delete()
				.eq("id", invitationId);

			if (deleteError) throw deleteError;

			// Refresh invitations list
			if (currentGroupId.value) {
				await fetchGroupInvitations();
			}

			return true;
		} catch (err) {
			error.value = err as Error;
			console.error("Error canceling invitation:", err);
			return false;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Get count of pending invitations for current user
	 */
	const pendingCount = computed(() => pendingInvitations.value.length);

	/**
	 * Get count of active invitations for a group
	 */
	const activeInvitationsCount = computed(() => {
		return invitations.value.filter(
			(inv) => inv.status === "pending" && new Date(inv.expires_at) > new Date()
		).length;
	});

	// Auto-fetch based on context
	if (user.value) {
		// Always fetch user's pending invitations
		fetchPendingInvitations();

		// Fetch group invitations if group ID is provided
		if (currentGroupId.value) {
			fetchGroupInvitations();
		}
	}

	// Watch for group ID changes
	if (typeof groupId !== "string") {
		watch(currentGroupId, (newId) => {
			if (newId) {
				fetchGroupInvitations();
			}
		});
	}

	return {
		// State
		invitations,
		pendingInvitations,
		loading,
		error,

		// Computed
		pendingCount,
		activeInvitationsCount,

		// Actions
		fetchGroupInvitations,
		fetchPendingInvitations,
		sendInvitation,
		acceptInvitation,
		declineInvitation,
		cancelInvitation,
	};
};
