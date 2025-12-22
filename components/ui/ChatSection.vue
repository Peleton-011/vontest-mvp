<script setup lang="ts">
const props = defineProps<{
	threadId: string;
}>();

const {
	submitComment,
	form,
	resetForm,
	nodeMap,
	loadComments,
} = useComments(props.threadId);

const messagesContainer = ref<HTMLElement | null>(null);
const isSubmitting = ref(false);

// Get all messages sorted by creation time (flat, no threading)
const messages = computed(() => {
	return Array.from(nodeMap.value.values())
		.filter(node => !node.parentIds.length) // Only root-level messages
		.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
});

// Group messages by same user within 5 minutes
const groupedMessages = computed(() => {
	const grouped: Array<{
		userId: string;
		username: string | null;
		avatarUrl: string;
		messages: Array<{ id: string; comment: string; createdAt: Date }>;
		timestamp: Date;
	}> = [];

	messages.value.forEach((msg, index) => {
		const prevMsg = messages.value[index - 1];
		const timeDiff = prevMsg
			? (msg.createdAt.getTime() - prevMsg.createdAt.getTime()) / 1000 / 60
			: Infinity;

		// Group if same user and within 5 minutes
		const shouldGroup = prevMsg
			&& prevMsg.author.id === msg.author.id
			&& timeDiff < 5;

		if (shouldGroup && grouped.length > 0) {
			// Add to existing group
			grouped[grouped.length - 1].messages.push({
				id: msg.id,
				comment: msg.comment,
				createdAt: msg.createdAt,
			});
		} else {
			// Start new group
			grouped.push({
				userId: msg.author.id,
				username: msg.author.username,
				avatarUrl: msg.author.avatarUrl,
				messages: [{
					id: msg.id,
					comment: msg.comment,
					createdAt: msg.createdAt,
				}],
				timestamp: msg.createdAt,
			});
		}
	});

	return grouped;
});

onMounted(loadComments);

// Handler: post a new message
const postMessage = async () => {
	if (!form.comment.value.trim()) return;

	isSubmitting.value = true;
	try {
		await submitComment();
		resetForm();
		await loadComments();
		await nextTick();
		scrollToBottom();
	} catch (e: unknown) {
		if (e instanceof Error) {
			console.error("Failed to post message:", e.message);
		} else {
			console.error("An unknown error occurred:", e);
		}
	} finally {
		isSubmitting.value = false;
	}
};

// Auto-scroll to bottom of messages
const scrollToBottom = () => {
	if (messagesContainer.value) {
		messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
	}
};

// Watch for new messages and auto-scroll
watch(() => groupedMessages.value.length, () => {
	nextTick(() => scrollToBottom());
});
</script>

<template>
	<div class="flex flex-col h-[600px] bg-neutral-950 rounded-2xl">
		<!-- Messages Area (scrollable) -->
		<div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
			<!-- Loading State -->
			<div v-if="groupedMessages.length === 0" class="text-center py-12">
				<UIcon
					name="i-heroicons-chat-bubble-left-right"
					class="w-16 h-16 mx-auto text-gray-400"
				/>
				<h3 class="text-xl font-semibold mt-4">No messages yet</h3>
				<p class="text-gray-400 mt-2">
					Start the conversation!
				</p>
			</div>

			<!-- Messages List (Grouped) -->
			<div v-else class="space-y-4">
				<div
					v-for="group in groupedMessages"
					:key="group.userId + group.timestamp"
					class="flex gap-3 bg-neutral-900 rounded-lg p-3"
				>
					<!-- Avatar (shown once per group) -->
					<UAvatar
						:src="group.avatarUrl"
						:alt="group.username || 'User'"
						size="sm"
						class="flex-shrink-0"
					/>

					<!-- Message Group -->
					<div class="flex-1 min-w-0 space-y-1">
						<!-- Username and timestamp (shown once per group) -->
						<div class="flex items-baseline gap-2">
							<span class="font-semibold text-sm">
								{{ group.username || "Unknown User" }}
							</span>
							<span class="text-xs text-gray-500">
								{{
									group.timestamp.toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
									})
								}}
							</span>
						</div>

						<!-- Messages from same user -->
						<div
							v-for="msg in group.messages"
							:key="msg.id"
							class="text-sm text-gray-700"
							v-html="msg.comment"
						></div>
					</div>
				</div>
			</div>
		</div>

		<!-- Message Input (fixed bottom) -->
		<div class="border-t-4 border-t-neutral-900 p-4 ">
			<form class="flex gap-2" @submit.prevent="postMessage">
				<UInput
					v-model="form.comment.value"
					placeholder="Type a message..."
					class="flex-1"
					:disabled="isSubmitting"
				/>
				<UButton
					type="submit"
					icon="i-heroicons-paper-airplane"
					:disabled="!form.comment.value.trim() || isSubmitting"
					:loading="isSubmitting"
				>
					Send
				</UButton>
			</form>
		</div>
	</div>
</template>
