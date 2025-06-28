<script setup lang="ts">
import type { CommentNode } from "~/composables/useComments";
import OptionsDropdown from "~/components/ui/OptionsDropdown.vue";

const props = defineProps<{
	node: CommentNode;
	depth?: number;
	nodeMap: Map<string, CommentNode>;
	newCommentParents: string[];
	newCommentText: string;
	editingComment?: string;
	isAlternate?: boolean;
}>();

const emit = defineEmits<{
	(
		e: "update:comment-text" | "delete-comment" | "edit-comment",
		payload: string
	): void;
	(e: "update:comment-parents", parents: string[]): void;
	(
		e: "post-comment" | "post-update" | "cancel-update" | "toggle-editor"
	): void;
}>();

const user = useSupabaseUser();

const isEditing = computed(() => props.editingComment === props.node.id);

const showReplies = ref(props.depth === undefined || props.depth < 2);
const toggleReplies = () => {
	showReplies.value = !showReplies.value;
};

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

const handleDeleteRef = (id: string) => {
	const newCommentParents = props.newCommentParents.filter(
		(toRemove) => id !== toRemove
	);
	emit("update:comment-parents", newCommentParents);
};
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

				<Transition name="fade">
					<UiEditorGeneral
						v-if="isEditing"
						:new-comment-text="localCommentText"
						:new-comment-parents="newCommentParents"
						:node-map="nodeMap"
						@cancel="emit('cancel-update')"
						@post-comment="emit('post-update')"
						@update:comment-text="
							emit('update:comment-text', $event)
						"
						@update:comment-parents="
							emit('update:comment-parents', $event)
						"
						@toggle-editor="emit('toggle-editor')"
					/>
				</Transition>

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
										comment: {
											text: node.comment,
											createdAt: node.createdAt,
										},
									};
								})
							"
							direction="forward"
							@remove-ref="handleDeleteRef"
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
								@click="toggleReplies"
							>
								{{ showReplies ? "Hide" : "Show" }}
								{{ node.children.length }} repl{{
									node.children.length === 1 ? "y" : "ies"
								}}
							</button>
						</div>

						<!-- Secondary children/ Backward refs (“Also referenced by”) -->
						<UiCommentRefs
							:refs="
								node.backChildrenIds.map((id) => {
									const node = nodeMap.get(id)!;
									return {
										id,
										author: node.author!,
										comment: {
											text: node.comment,
											createdAt: node.createdAt,
										},
									};
								})
							"
							direction="backward"
							@remove-ref="handleDeleteRef"
						/>
					</div>
				</template>
			</UCard>

			<Transition name="fade">
				<UiEditorGeneral
					v-if="
						newCommentParents[0] === node.id &&
						!isEditing &&
						!editingComment &&
						!props.isAlternate
					"
					:new-comment-text="localCommentText"
					:new-comment-parents="newCommentParents"
					:node-map="nodeMap"
					@cancel="emit('cancel-update')"
					@post-comment="emit('post-comment')"
					@update:comment-text="emit('update:comment-text', $event)"
					@update:comment-parents="
						emit('update:comment-parents', $event)
					"
					@toggle-editor="emit('toggle-editor')"
				/>
			</Transition>

			<!-- Recursive rendering of primary‐nested children -->
			<Transition name="fade">
				<div
					v-if="node.children.length && showReplies"
					class="space-y-4 mt-4"
				>
					<UiCommentItem
						v-for="child in node.children"
						:key="child.id"
						:node="child"
						:depth="(depth || 0) + 1"
						:node-map="nodeMap"
						:new-comment-text="localCommentText"
						:new-comment-parents="newCommentParents"
						:editing-comment="editingComment"
						:is-alternate="isAlternate"
						@update:comment-text="
							emit('update:comment-text', $event)
						"
						@update:comment-parents="
							emit('update:comment-parents', $event)
						"
						@post-comment="emit('post-comment')"
						@delete-comment="emit('delete-comment', $event)"
						@edit-comment="emit('edit-comment', $event)"
						@post-update="emit('post-update')"
						@cancel-update="emit('cancel-update')"
						@toggle-editor="emit('toggle-editor')"
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
