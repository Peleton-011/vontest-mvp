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
		.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
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
watch(() => messages.value.length, () => {
	nextTick(() => scrollToBottom());
});
</script>

<template>
	<div class="flex flex-col h-[600px]">
		<!-- Messages Area (scrollable) -->
		<div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-3">
			<!-- Loading State -->
			<div v-if="messages.length === 0" class="text-center py-12">
				<UIcon
					name="i-heroicons-chat-bubble-left-right"
					class="w-16 h-16 mx-auto text-gray-400"
				/>
				<h3 class="text-xl font-semibold mt-4">No messages yet</h3>
				<p class="text-gray-600 mt-2">
					Start the conversation!
				</p>
			</div>

			<!-- Messages List -->
			<div v-else class="space-y-3">
				<div
					v-for="msg in messages"
					:key="msg.id"
					class="flex gap-3"
				>
					<UAvatar
						:src="msg.avatar_url"
						:alt="msg.username || 'User'"
						size="sm"
						class="flex-shrink-0"
					/>
					<div class="flex-1 min-w-0">
						<div class="flex items-baseline gap-2">
							<span class="font-semibold text-sm">
								{{ msg.username || "Unknown User" }}
							</span>
							<span class="text-xs text-gray-500">
								{{
									new Date(msg.created_at).toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
									})
								}}
							</span>
						</div>
						<div class="text-sm text-gray-700 mt-1" v-html="msg.comment"></div>
					</div>
				</div>
			</div>
		</div>

		<!-- Message Input (fixed bottom) -->
		<div class="border-t p-4">
			<form @submit.prevent="postMessage" class="flex gap-2">
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
