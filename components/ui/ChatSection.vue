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

const user = useSupabaseUser();
const messagesContainer = ref<HTMLElement | null>(null);
const isSubmitting = ref(false);

// Get all messages sorted by creation time (flat, no threading)
const messages = computed(() => {
	return Array.from(nodeMap.value.values())
		.filter(node => !node.parentIds.length) // Only root-level messages
		.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
});

// Extract game type from announcement HTML
const parseGameType = (html: string): string | null => {
	const match = html.match(/>(Would You Rather|Hot Takes|Guess Who Said It|Most Likely To)</);
	return match ? match[1] : null;
};

// Group messages by same user within 5 minutes
const groupedMessages = computed(() => {
	const grouped: Array<{
		userId: string | null;
		username: string | null;
		avatarUrl: string;
		messages: Array<{ id: string; comment: string; createdAt: Date; messageType?: string; gameType?: string | null }>;
		timestamp: Date;
		isSystem: boolean;
		isCurrentUser: boolean;
		isGameAnnouncement: boolean;
	}> = [];

	messages.value.forEach((msg, index) => {
		const prevMsg = messages.value[index - 1];
		const timeDiff = prevMsg
			? (msg.createdAt.getTime() - prevMsg.createdAt.getTime()) / 1000 / 60
			: Infinity;

		// Check if this is a system message
		const isSystem = !msg.author || msg.author.id === null;

		// Check if this is a game announcement
		const isGameAnnouncement = msg.messageType === 'game_announcement';

		// Check if this is the current user's message
		const isCurrentUser = user.value?.id === msg.author?.id;

		// Group if same user and within 5 minutes, but never group game announcements
		const shouldGroup = !isGameAnnouncement && prevMsg
			&& prevMsg.author?.id === msg.author?.id
			&& timeDiff < 5;

		if (shouldGroup && grouped.length > 0) {
			// Add to existing group
			grouped[grouped.length - 1].messages.push({
				id: msg.id,
				comment: msg.comment,
				createdAt: msg.createdAt,
				messageType: msg.messageType,
				gameType: isGameAnnouncement ? parseGameType(msg.comment) : null,
			});
		} else {
			// Start new group
			grouped.push({
				userId: msg.author?.id || null,
				username: isSystem ? 'System' : msg.author?.username || null,
				avatarUrl: isSystem ? '/system-avatar.png' : (msg.author?.avatarUrl || ''),
				messages: [{
					id: msg.id,
					comment: msg.comment,
					createdAt: msg.createdAt,
					messageType: msg.messageType,
					gameType: isGameAnnouncement ? parseGameType(msg.comment) : null,
				}],
				timestamp: msg.createdAt,
				isSystem,
				isCurrentUser,
				isGameAnnouncement,
			});
		}
	});

	return grouped;
});

onMounted(async () => {
	await loadComments();
	await nextTick();
	scrollToBottom();
});

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
		<div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-3">
			<!-- Empty State -->
			<UiEmptyState
				v-if="groupedMessages.length === 0"
				icon="i-heroicons-chat-bubble-left-right"
				title="No messages yet"
				description="Start the conversation!"
			/>

			<!-- Messages List (Grouped) -->
			<div v-else class="space-y-3">
				<!-- Message Group -->
				<div
					v-for="group in groupedMessages"
					:key="group.userId + group.timestamp"
					:class="[
						'flex gap-3',
						group.isCurrentUser ? 'justify-end' : 'justify-start'
					]"
				>
					<!-- Avatar (only for other users, not current user or system) -->
					<UAvatar
						v-if="!group.isSystem && !group.isCurrentUser"
						:src="group.avatarUrl"
						:alt="group.username || 'User'"
						size="sm"
						class="flex-shrink-0 mt-1"
					/>

					<!-- System icon for automated messages (not game announcements) -->
					<div
						v-else-if="group.isSystem && !group.isGameAnnouncement"
						class="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mt-1"
					>
						<UIcon name="i-heroicons-cpu-chip" class="w-4 h-4 text-white" />
					</div>

					<!-- Message Group Container -->
					<div :class="['space-y-1', group.isGameAnnouncement ? 'w-full' : (group.isCurrentUser ? 'max-w-[75%]' : 'flex-1 min-w-0 max-w-[75%]')]">
						<!-- Username and timestamp (only for other users, not system) -->
						<div
							v-if="!group.isCurrentUser && !group.isSystem"
							class="flex items-baseline gap-2 px-1"
						>
							<span class="font-semibold text-sm text-gray-200">
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

						<!-- System message header (not for game announcements) -->
						<div
							v-if="group.isSystem && !group.isGameAnnouncement"
							class="flex items-baseline gap-2 px-1"
						>
							<span class="font-semibold text-sm text-purple-400">
								System
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
						>
							<!-- Game Announcement Card -->
							<UCard
								v-if="msg.messageType === 'game_announcement'"
								class="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-2 border-purple-500/30"
							>
								<div class="text-center py-2">
									<div class="text-2xl mb-2">🎲</div>
									<div class="font-bold text-lg mb-1">New Daily Game!</div>
									<div class="text-sm">
										{{ msg.gameType }} is now live! Check the Games tab to play.
									</div>
								</div>
							</UCard>

							<!-- Regular Message -->
							<div
								v-else
								:class="[
									'text-sm break-words',
									group.isCurrentUser
										? 'bg-primary-600 text-white rounded-2xl px-4 py-2'
										: group.isSystem
											? 'text-gray-300'
											: 'bg-neutral-800 text-gray-200 rounded-2xl px-4 py-2'
								]"
								v-html="msg.comment"
							></div>
						</div>

						<!-- Timestamp for current user (shown after messages) -->
						<div
							v-if="group.isCurrentUser"
							class="text-xs text-gray-500 text-right px-1"
						>
							{{
								group.timestamp.toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})
							}}
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Message Input (fixed bottom) -->
		<div class="border-t border-neutral-800 p-4">
			<form class="flex gap-2" @submit.prevent="postMessage">
				<UInput
					v-model="form.comment.value"
					placeholder="Type a message..."
					class="flex-1"
					size="lg"
					:disabled="isSubmitting"
					aria-label="Type a message"
					aria-describedby="chat-input-help"
				/>
				<span id="chat-input-help" class="sr-only">Press Enter to send message</span>
				<UButton
					type="submit"
					size="lg"
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
