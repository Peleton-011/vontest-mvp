import type { Database } from "~/types/supabase";

interface InviteCodeWithStats {
	id: string;
	group_id: string;
	code: string;
	created_by: string;
	created_at: string;
	expires_at: string | null;
	max_uses: number | null;
	uses_count: number;
	is_active: boolean;
	group_name: string;
	created_by_username: string | null;
	actual_uses: number;
}

interface JoinResult {
	success: boolean;
	error?: string;
	group_id?: string;
	group_name?: string;
	group_description?: string | null;
}

interface GroupPreview {
	group_id: string;
	group_name: string;
	group_description: string | null;
	member_count: number;
	is_active: boolean;
	expires_at: string | null;
	uses_count: number;
	max_uses: number | null;
	error?: string;
}

export const useInviteCodes = (groupId?: Ref<string> | string) => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();
	const config = useRuntimeConfig();

	const inviteCodes = ref<InviteCodeWithStats[]>([]);
	const error = ref<Error | null>(null);
	const loading = ref(false);

	// Get reactive group ID
	const currentGroupId = computed(() => {
		return typeof groupId === "string" ? groupId : groupId?.value || "";
	});

	/**
	 * Fetch all invite codes for a group
	 */
	const fetchInviteCodes = async () => {
		if (!currentGroupId.value) {
			error.value = new Error("No group ID provided");
			return;
		}

		loading.value = true;

		try {
			const { data, error: fetchError } = await supabase
				.from("group_invite_codes_with_stats")
				.select("*")
				.eq("group_id", currentGroupId.value)
				.order("created_at", { ascending: false });

			if (fetchError) throw fetchError;
			inviteCodes.value = (data as InviteCodeWithStats[]) || [];
		} catch (err) {
			error.value = err as Error;
			console.error("Error fetching invite codes:", err);
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Create a new invite code
	 */
	const createInviteCode = async (
		expiresInDays?: number,
		maxUses?: number
	): Promise<string | null> => {
		if (!currentGroupId.value) {
			error.value = new Error("No group ID provided");
			return null;
		}

		loading.value = true;

		try {
			const { data, error: createError } = await supabase.rpc(
				"create_group_invite_code",
				{
					p_group_id: currentGroupId.value,
					p_expires_in_days: expiresInDays || null,
					p_max_uses: maxUses || null,
				}
			);

			if (createError) throw createError;

			// Refresh codes list
			await fetchInviteCodes();

			return data as string;
		} catch (err) {
			error.value = err as Error;
			console.error("Error creating invite code:", err);
			return null;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Deactivate an invite code
	 */
	const deactivateCode = async (code: string): Promise<boolean> => {
		loading.value = true;

		try {
			const { data, error: deactivateError } = await supabase.rpc(
				"deactivate_invite_code",
				{
					p_code: code,
				}
			);

			if (deactivateError) throw deactivateError;

			// Refresh codes list
			if (currentGroupId.value) {
				await fetchInviteCodes();
			}

			return data as boolean;
		} catch (err) {
			error.value = err as Error;
			console.error("Error deactivating code:", err);
			return false;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Join a group using an invite code
	 */
	const joinViaCode = async (code: string): Promise<JoinResult> => {
		if (!user.value) {
			return {
				success: false,
				error: "User not authenticated",
			};
		}

		loading.value = true;

		try {
			const { data, error: joinError } = await supabase.rpc(
				"join_group_via_code",
				{
					p_code: code,
				}
			);

			if (joinError) throw joinError;

			return data as JoinResult;
		} catch (err) {
			error.value = err as Error;
			console.error("Error joining via code:", err);
			return {
				success: false,
				error: err instanceof Error ? err.message : "Unknown error",
			};
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Get group preview from invite code (before joining)
	 */
	const getGroupPreview = async (code: string): Promise<GroupPreview | null> => {
		loading.value = true;

		try {
			const { data, error: previewError } = await supabase.rpc(
				"get_group_from_invite_code",
				{
					p_code: code,
				}
			);

			if (previewError) throw previewError;

			return data as GroupPreview;
		} catch (err) {
			error.value = err as Error;
			console.error("Error getting group preview:", err);
			return null;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Generate shareable invite link
	 */
	const getInviteLink = (code: string): string => {
		const baseUrl = config.public.siteUrl || window.location.origin;
		return `${baseUrl}/games/join/${code}`;
	};

	/**
	 * Copy invite link to clipboard
	 */
	const copyInviteLink = async (code: string): Promise<boolean> => {
		const link = getInviteLink(code);

		try {
			await navigator.clipboard.writeText(link);
			return true;
		} catch (err) {
			console.error("Error copying to clipboard:", err);
			return false;
		}
	};

	/**
	 * Get active invite codes (not expired, still has uses)
	 */
	const activeInviteCodes = computed(() => {
		return inviteCodes.value.filter((code) => {
			if (!code.is_active) return false;
			if (code.expires_at && new Date(code.expires_at) < new Date())
				return false;
			if (code.max_uses && code.uses_count >= code.max_uses) return false;
			return true;
		});
	});

	/**
	 * Check if group has any active codes
	 */
	const hasActiveCodes = computed(() => activeInviteCodes.value.length > 0);

	// Auto-fetch if group ID is provided
	if (currentGroupId.value) {
		fetchInviteCodes();
	}

	// Watch for group ID changes
	if (typeof groupId !== "string") {
		watch(currentGroupId, (newId) => {
			if (newId) {
				fetchInviteCodes();
			}
		});
	}

	return {
		// State
		inviteCodes,
		activeInviteCodes,
		loading,
		error,

		// Computed
		hasActiveCodes,

		// Actions
		fetchInviteCodes,
		createInviteCode,
		deactivateCode,
		joinViaCode,
		getGroupPreview,
		getInviteLink,
		copyInviteLink,
	};
};
