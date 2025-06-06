<script setup lang="ts">
import { ref } from "vue";
import type { CommentNode } from "~/composables/useComments";

const props = defineProps<{
	node: CommentNode;
	depth?: number;
	nodeMap: Map<string, CommentNode>;
	replyTexts: Record<string, string>;
}>();

// We will emit two events:
// 1) update:reply-text  (payload: { id: string; value: string })
// 2) post-reply        (payload: commentId: string)
const emit = defineEmits<{
	(e: "update:reply-text", payload: { id: string; value: string }): void;
	(e: "post-reply", id: string): void;
}>();

// Computed getter/setter for this node’s replyText
const localReply = computed<string>({
	get: () => {
		// If no entry exists yet, fallback to empty string
		return props.replyTexts[props.node.id] || "";
	},
	set: (val: string) => {
		emit("update:reply-text", { id: props.node.id, value: val });
	},
});

const showBackRefs = ref(false);
const toggleBackRefs = () => {
	showBackRefs.value = !showBackRefs.value;
};

// When the user clicks “Post Comment” under this node:
const onClickPostReply = () => {
	emit("post-reply", props.node.id);
};
</script>

<template>
	<div
		:id="node.id"
		:style="{ marginLeft: (depth || 0) + 'rem' }"
		class="space-y-2"
	>
		<UCard>
			<template #header>
				<div class="flex items-center mb-1">
					<img
						v-if="node.author.avatarUrl"
						:src="node.author.avatarUrl"
						class="w-6 h-6 rounded-full mr-2"
					/>
					<span class="font-medium">{{ node.author.username }}</span>
					<small class="text-gray-500 ml-2">
						• {{ node.createdAt.toLocaleString() }}
					</small>
				</div>
			</template>

			<p class="text-gray-300">{{ node.comment }}</p>

			<template #footer>
				<div class="flex flex-col gap-2">
					<!-- Secondary parents (“Also replies to”) -->
					<div v-if="node.secondaryParentIds.length">
						<small class="text-sm text-gray-400">
							Also replies to:
							<span
								v-for="(pid, idx) in node.secondaryParentIds"
								:key="pid"
							>
								<a
									:href="'#' + pid"
									class="underline hover:text-gray-200"
								>
									{{
										nodeMap.get(pid)?.author.username || pid
									}}
								</a>
								<span
									v-if="
										idx < node.secondaryParentIds.length - 1
									"
									>,
								</span>
							</span>
						</small>
					</div>

					<!-- Reply button / collapsible -->
					<div>
						<UCollapsible>
							<UButton
								label="Reply"
								variant="subtle"
								size="xs"
								icon="i-lucide-message-circle"
							/>
							<template #content>
								<div class="mb-4">
									<textarea
										v-model="localReply"
										class="w-full p-2 rounded bg-gray-800"
										rows="3"
										placeholder="Write your reply..."
									/>
									<div class="text-right mt-2">
										<UButton
											label="Post Comment"
											:disabled="!localReply?.trim()"
											@click="onClickPostReply()"
										/>
									</div>
								</div>
							</template>
						</UCollapsible>
					</div>

					<!-- Back‐references (“Referenced by X other comments”) -->
					<div v-if="node.backChildrenCount">
						<small class="text-sm text-gray-400">
							<button class="underline" @click="toggleBackRefs">
								Referenced by {{ node.backChildrenCount }} other
								comment
								<span v-if="node.backChildrenCount > 1">s</span>
							</button>
						</small>
						<ul
							v-if="showBackRefs"
							class="list-disc list-inside text-gray-400"
						>
							<li v-for="bid in node.backChildrenIds" :key="bid">
								<a
									:href="'#' + bid"
									class="underline hover:text-gray-200"
								>
									{{
										nodeMap.get(bid)?.author.username || bid
									}}
								</a>
							</li>
						</ul>
					</div>
				</div>
			</template>

			<!-- Recursive rendering of primary‐nested children -->
			<div v-if="node.children.length" class="space-y-4 mt-4">
				<CommentItem
					v-for="child in node.children"
					:key="child.id"
					:node="child"
					:depth="(depth || 0) + 1"
					:node-map="nodeMap"
					:reply-texts="replyTexts"
					@update:reply-text="
						(payload) => emit('update:reply-text', payload)
					"
					@post-reply="(payload) => emit('post-reply', payload)"
				/>
			</div>
		</UCard>
	</div>
</template>
