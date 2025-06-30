<script setup lang="ts">
import OptionsDropdown from "~/components/ui/OptionsDropdown.vue";
import DOMPurify from "dompurify";
import type { FullCommentNode } from "~/composables/useComments";

const props = defineProps<{
	node: FullCommentNode;
	depth?: number;
	editingComment?: string;
}>();

const localCommentText = defineModel("newCommentText", {
	type: String,
	required: true,
});

const localCommentParents = defineModel("newCommentParents", {
	type: Array<string>,
	required: true,
});

const isAlternate = defineModel("isAlternate", {
	type: Boolean,
	required: true,
	default: false,
});

const emit = defineEmits<{
	(e: "post-comment" | "post-update" | "cancel-update"): void;
	(
		e:
			| "delete-comment"
			| "edit-comment"
			| "toggle-replies"
			| "activate-reference",
		payload: string
	): void;
	(e: "update:show-replies", payload: { id: string; show: boolean }): void;
}>();

const { commentIdsToRefs } = useComments();

const user = useSupabaseUser();

const isEditing = computed(() => props.editingComment === props.node.id);

const invertedShowReplies = computed({
	get: () => !props.node.showReplies,
	set: (val: boolean) => {
		emit("update:show-replies", { id: props.node.id, show: !val });
	},
});

const isDefaultReplyEditorOpen = computed({
	get: () => {
		return (
			localCommentParents.value[0] === props.node.id &&
			!props.editingComment &&
			!isAlternate
		);
	},
	set: (val: boolean) => {
		return val;
	},
});

const handleReplyButtonClick = () => {
	if (
		!localCommentParents.value.length ||
		!localCommentParents.value.includes(props.node.id)
	) {
		localCommentParents.value.push(props.node.id);
	} else {
		localCommentParents.value = localCommentParents.value.filter(
			(id) => id !== props.node.id
		);
	}
};

const handleToggleEditor = () => {
	isAlternate.value = !isAlternate.value;
};

const renderReplyButtonLabel = () => {
	if (!localCommentParents.value.length) return "Reply";
	if (!localCommentParents.value.includes(props.node.id))
		return "Also Reply To";
	if (localCommentParents.value[0] === props.node.id) return "Cancel";
	return "Stop Replying To";
};

const handleDeleteRef = (id: string) => {
	localCommentParents.value = localCommentParents.value.filter(
		(toRemove) => id !== toRemove
	);
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
					localCommentParents.includes(props.node.id)
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

				<span
					v-if="!isEditing"
					ref="text"
					class="prose dark:prose-inverted markdown-body pt-0 text-sm text-gray-400 border-neutral-700"
					v-html="DOMPurify.sanitize(node.comment)"
				/>

				<Transition name="fade">
					<UiEditorGeneral
						v-if="isEditing"
						v-model:new-comment-text="localCommentText"
						v-model:new-comment-parents="localCommentParents"
						@cancel="emit('cancel-update')"
						@post-comment="emit('post-update')"
						@toggle-editor="handleToggleEditor"
					/>
				</Transition>

				<template #footer>
					<div class="flex flex-col gap-2">
						<!-- Secondary parents/ Forward refs (“Also replies to”) -->

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
						<UiCommentRefs
							:refs="commentIdsToRefs(node.secondaryParentIds)"
							direction="forward"
							@remove-ref="handleDeleteRef"
							@activate-reference="
								emit('activate-reference', $event)
							"
						/>

						<!-- Secondary children/ Backward refs (“Also referenced by”) -->
						<UiCommentRefs
							:refs="commentIdsToRefs(node.backChildrenIds)"
							direction="backward"
							@remove-ref="handleDeleteRef"
							@activate-reference="
								emit('activate-reference', $event)
							"
						/>
					</div>
					<!-- Toggle seeing responses -->
					<div v-if="node.children.length">
						<UButton
							variant="ghost"
							color="neutral"
							size="xs"
							class="text-sm text-gray-400 hover:text-primary-400"
							@click="emit('toggle-replies', node.id)"
						>
							{{ node.showReplies ? "Hide" : "Show" }}
							{{ node.children.length }} repl{{
								node.children.length === 1 ? "y" : "ies"
							}}
						</UButton>
					</div>
				</template>
			</UCard>

			<UCollapsible v-model:open="isDefaultReplyEditorOpen">
				<template #content>
					<UiEditorGeneral
						v-model:new-comment-text="localCommentText"
						v-model:new-comment-parents="localCommentParents"
						@cancel="emit('cancel-update')"
						@post-comment="emit('post-comment')"
						@toggle-editor="handleToggleEditor"
						@activate-reference="emit('activate-reference', $event)"
					/>
				</template>
			</UCollapsible>

			<!-- Recursive rendering of primary‐nested children -->
			<UCollapsible
				v-if="node.children.length"
				v-model:open="node.showReplies"
			>
				<template #content>
					<UiCommentItem
						v-for="child in node.children"
						class="space-y-4 mt-4"
						:key="child.id"
						v-model:new-comment-text="localCommentText"
						v-model:new-comment-parents="localCommentParents"
						v-model:is-alternate="isAlternate"
						:node="child"
						:depth="(depth || 0) + 1"
						:editing-comment="editingComment"
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
				</template>
			</UCollapsible>
			<UCollapsible
				v-if="node.children.length"
				v-model:open="invertedShowReplies"
				class="text-2xl"
			>
				<template #content> · · · </template>
			</UCollapsible>
		</div>
	</div>
</template>
