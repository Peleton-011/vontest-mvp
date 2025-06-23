<script setup lang="ts">
import OptionsDropdown from "~/components/ui/OptionsDropdown.vue";
import type { FullCommentNode } from "./CommentSection.vue";

const props = defineProps<{
	node: FullCommentNode;
	depth?: number;
	nodeMap: Map<string, FullCommentNode>;
	newCommentParents: string[];
	newCommentText: string;
	editingComment?: string;
}>();

const emit = defineEmits<{
	(
		e:
			| "update:comment-text"
			| "delete-comment"
			| "edit-comment"
			| "toggle-replies"
			| "activate-reference",
		payload: string
	): void;
	(e: "update:comment-parents", parents: string[]): void;
	(e: "update:show-replies", payload: { id: string; show: boolean }): void;
	(e: "post-comment" | "post-update" | "cancel-update"): void;
}>();

const user = useSupabaseUser();

const isEditing = computed(() => props.editingComment === props.node.id);

// Computed getter/setter for this node’s comment text
const localCommentText = computed<string>({
	get: () => {
		return props.newCommentText || "";
	},
	set: (val: string) => {
		emit("update:comment-text", val);
	},
});

const handleReplyButtonClick = () => {
	if (
		!props.newCommentParents.length ||
		!props.newCommentParents.includes(props.node.id)
	) {
		const newCommentParents = [...props.newCommentParents];
		newCommentParents.push(props.node.id);
		emit("update:comment-parents", newCommentParents);
	} else {
		const newCommentParents = props.newCommentParents.filter(
			(id) => id !== props.node.id
		);
		emit("update:comment-parents", newCommentParents);
	}
};

const renderReplyButtonLabel = () => {
	if (!props.newCommentParents.length) return "Reply";
	if (!props.newCommentParents.includes(props.node.id))
		return "Also Reply To";
	if (props.newCommentParents[0] === props.node.id) return "Cancel";
	return "Stop Replying To";
};

onMounted(() => {
	if (typeof props.node.showReplies === "undefined") {
		// Show replies if comment is less than 5 minutes old
		if (props.node.createdAt.getTime() > Date.now() - 5 * 60 * 1000) {
			emit("update:show-replies", {
				id: props.node.id,
				show: true,
			});
		}
		// Show replies if comment is less than 3 levels deep
		emit("update:show-replies", {
			id: props.node.id,
			show: props.depth! < 3,
		});
	}
});
</script>

<template>
	<div class="flex">
		<!-- Vertical nesting line -->
		<div v-if="props.depth" class="w-4 border-l border-gray-600" />

		<!-- Comment content block -->
		<div :id="node.id" class="flex-1 space-y-2">
			<UCard
				:class="
					props.newCommentParents.includes(props.node.id)
						? '!bg-neutral-700'
						: ''
				"
			>
				<template #header>
					<div class="flex items-center justify-between">
						<div class="flex items-center mb-1">
							<UiUserTag
								v-if="node.author"
								:author="node.author"
							/>
							<small class="text-gray-500 ml-2">
								• {{ node.createdAt.toLocaleString() }}
							</small>
						</div>
						<OptionsDropdown
							v-if="node.author.id === user?.id"
							@edit="
								emit('edit-comment', node.id);
								console.log(node);
							"
							@delete="emit('delete-comment', node.id)"
						/>
					</div>
				</template>

				<p v-if="!isEditing" class="text-gray-300">
					{{ node.comment }}
				</p>
				<div v-else class="mb-4">
					<textarea
						v-model="localCommentText"
						class="w-full p-2 rounded bg-gray-800"
						rows="3"
						placeholder="Write your reply..."
					/>
					<div class="text-right mt-2">
						<UButton
							label="Update Comment"
							:disabled="!localCommentText?.trim()"
							@click="emit('post-update')"
						/>
						<UButton
							label="Cancel"
							variant="subtle"
							@click="emit('cancel-update')"
						/>
					</div>
				</div>

				<template #footer>
					<div class="flex flex-col gap-2">
						<!-- Secondary parents/ Forward refs (“Also replies to”) -->

						<UiCommentRefs
							:refs="
								node.secondaryParentIds.map((id) => {
                                    const node = nodeMap.get(id)!;
									return {
										id,
										author: node.author!,
                                        comment: {text: node.comment, createdAt: node.createdAt}
									};
								})
							"
							direction="forward"
							@activate-reference="
								emit('activate-reference', $event)
							"
						/>

						<!-- Reply button / collapsible -->
						<div v-if="!isEditing">
							<UButton
								:label="renderReplyButtonLabel()"
								variant="subtle"
								size="xs"
								icon="i-lucide-message-circle"
								@click="handleReplyButtonClick"
							/>
						</div>

						<!-- Toggle seeing responses -->
						<div class="ml-4 mt-2">
							<button
								v-if="node.children.length"
								class="text-sm text-gray-400 hover:text-primary-400"
								@click="
									emit('toggle-replies', node.id);
									console.log(node.showReplies);
								"
							>
								{{ node.showReplies ? "Hide" : "Show" }}
								{{ node.children.length }} repl{{
									node.children.length === 1 ? "y" : "ies"
								}}
							</button>
						</div>

						<!-- Secondary children/ Backward refs (“Also referenced by”) -->
						<UiCommentRefs
							:refs="node.backChildrenIds.map((id) => {
                                const node = nodeMap.get(id)!;
									return {
										id,
										author: node.author!,
                                        comment: {text: node.comment, createdAt: node.createdAt}
									};
								})"
							direction="backward"
							@activate-reference="
								emit('activate-reference', $event)
							"
						/>
					</div>
					<div>ShowReplies: {{ node.showReplies }}</div>
				</template>
			</UCard>

			<div
				v-if="
					newCommentParents[0] === node.id &&
					!isEditing &&
					!editingComment
				"
				class="mb-4"
			>
				<textarea
					v-model="localCommentText"
					class="w-full p-2 rounded bg-gray-800"
					rows="3"
					placeholder="Write your reply..."
				/>
				<div class="text-right mt-2">
					<UButton
						label="Post Comment"
						:disabled="!localCommentText?.trim()"
						@click="emit('post-comment')"
					/>
				</div>
			</div>

			<!-- Recursive rendering of primary‐nested children -->
			<Transition name="fade">
				<div
					v-if="node.children.length && node.showReplies"
					class="space-y-4 mt-4"
				>
					<CommentItem
						v-for="child in node.children"
						:key="child.id"
						:node="child"
						:depth="(depth || 0) + 1"
						:node-map="nodeMap"
						:new-comment-text="localCommentText"
						:new-comment-parents="newCommentParents"
						:editing-comment="editingComment"
						@update:comment-text="
							(payload) => emit('update:comment-text', payload)
						"
						@update:comment-parents="
							(payload) => emit('update:comment-parents', payload)
						"
						@post-comment="emit('post-comment')"
						@delete-comment="emit('delete-comment', $event)"
						@edit-comment="emit('edit-comment', $event)"
						@post-update="emit('post-update')"
						@cancel-update="emit('cancel-update')"
						@toggle-replies="emit('toggle-replies', $event)"
						@update:show-replies="
							emit('update:show-replies', $event)
						"
						@activate-reference="emit('activate-reference', $event)"
					/>
				</div>
			</Transition>
		</div>
	</div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
