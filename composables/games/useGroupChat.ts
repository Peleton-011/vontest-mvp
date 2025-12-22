import type { Database } from "~/types/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Comment = Database["public"]["Tables"]["comments"]["Row"];
type CommentInsert = Database["public"]["Tables"]["comments"]["Insert"];

interface MessageWithProfile extends Comment {
	username: string | null;
	avatar_url: string;
}

export const useGroupChat = (groupId: Ref<string> | string) => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();

	const messages = ref<MessageWithProfile[]>([]);
	const error = ref<Error | null>(null);
	const loading = ref(false);
	const threadId = ref<string | null>(null);

	let realtimeChannel: RealtimeChannel | null = null;

	// Get reactive group ID
	const currentGroupId = computed(() => {
		return typeof groupId === "string" ? groupId : groupId?.value || "";
	});

	/**
	 * Get or create the group chat thread
	 */
	const getOrCreateThread = async (): Promise<string | null> => {
		try {
			const { data, error: rpcError } = await supabase.rpc(
				"create_group_chat_thread",
				{
					p_group_id: currentGroupId.value,
				}
			);

			if (rpcError) throw rpcError;
			return data as string;
		} catch (err) {
			error.value = err as Error;
			console.error("Error getting/creating thread:", err);
			return null;
		}
	};

	/**
	 * Fetch all messages for the group chat
	 */
	const fetchMessages = async () => {
		if (!currentGroupId.value) {
			error.value = new Error("No group ID provided");
			return;
		}

		loading.value = true;

		try {
			// Get or create thread first
			const thread = await getOrCreateThread();
			if (!thread) {
				throw new Error("Failed to get group chat thread");
			}

			threadId.value = thread;

			// Fetch messages with user profiles
			const { data, error: fetchError } = await supabase
				.from("comments")
				.select(
					`
					*,
					profiles!comments_user_id_fkey (
						username,
						avatar_url
					)
				`
				)
				.eq("thread_id", thread)
				.order("created_at", { ascending: true });

			if (fetchError) throw fetchError;

			// Map to include profile data
			messages.value = (data || []).map((msg: any) => ({
				...msg,
				username: msg.profiles?.username || null,
				avatar_url: msg.profiles?.avatar_url || "",
			}));
		} catch (err) {
			error.value = err as Error;
			console.error("Error fetching messages:", err);
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Send a message to the group chat
	 */
	const sendMessage = async (messageText: string) => {
		if (!user.value || !threadId.value) {
			error.value = new Error("User not authenticated or thread not ready");
			return false;
		}

		if (!messageText.trim()) {
			return false;
		}

		try {
			const newMessage: CommentInsert = {
				thread_id: threadId.value,
				user_id: user.value.id,
				comment: messageText.trim(),
			};

			const { error: insertError } = await supabase
				.from("comments")
				.insert(newMessage);

			if (insertError) throw insertError;

			return true;
		} catch (err) {
			error.value = err as Error;
			console.error("Error sending message:", err);
			return false;
		}
	};

	/**
	 * Subscribe to real-time message updates
	 */
	const subscribeToMessages = () => {
		if (!threadId.value) return;

		// Unsubscribe from existing channel if any
		if (realtimeChannel) {
			supabase.removeChannel(realtimeChannel);
		}

		// Subscribe to new messages in this thread
		realtimeChannel = supabase
			.channel(`group-chat:${threadId.value}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "comments",
					filter: `thread_id=eq.${threadId.value}`,
				},
				async (payload) => {
					// Fetch the new message with profile data
					const { data } = await supabase
						.from("comments")
						.select(
							`
							*,
							profiles!comments_user_id_fkey (
								username,
								avatar_url
							)
						`
						)
						.eq("id", payload.new.id)
						.single();

					if (data) {
						const newMsg: MessageWithProfile = {
							...data,
							username: (data as any).profiles?.username || null,
							avatar_url: (data as any).profiles?.avatar_url || "",
						};

						// Add to messages if not already there
						if (!messages.value.find((m) => m.id === newMsg.id)) {
							messages.value.push(newMsg);
						}
					}
				}
			)
			.subscribe();
	};

	/**
	 * Unsubscribe from real-time updates
	 */
	const unsubscribe = () => {
		if (realtimeChannel) {
			supabase.removeChannel(realtimeChannel);
			realtimeChannel = null;
		}
	};

	// Auto-fetch messages if group ID is provided
	if (currentGroupId.value) {
		fetchMessages().then(() => {
			subscribeToMessages();
		});
	}

	// Watch for group ID changes
	if (typeof groupId !== "string") {
		watch(currentGroupId, async (newId) => {
			if (newId) {
				await fetchMessages();
				subscribeToMessages();
			}
		});
	}

	// Cleanup on unmount
	onUnmounted(() => {
		unsubscribe();
	});

	return {
		// State
		messages,
		loading,
		error,

		// Actions
		fetchMessages,
		sendMessage,
		subscribeToMessages,
		unsubscribe,
	};
};
