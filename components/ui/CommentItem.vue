<script setup lang="ts">
import { ref } from "vue";
import type { CommentNode } from "~/composables/useComments";
import OptionsDropdown from "~/components/ui/OptionsDropdown.vue";

const props = defineProps<{
	node: CommentNode;
	depth?: number;
	nodeMap: Map<string, CommentNode>;
	newCommentParents: string[];
	newCommentText: string;
	editingComment?: string;
}>();

const emit = defineEmits<{
	(
		e: "update:comment-text" | "delete-comment" | "edit-comment",
		payload: string
	): void;
	(e: "update:comment-parents", parents: string[]): void;
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

const showBackRefs = ref(false);
const toggleBackRefs = () => {
	showBackRefs.value = !showBackRefs.value;
};

const showForwardRefs = ref(false);
const toggleForwardRefs = () => {
	showForwardRefs.value = !showForwardRefs.value;
};

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
						<!-- Secondary parents (“Also replies to”) -->
						<div v-if="node.secondaryParentIds.length">
							<small class="flex text-sm text-gray-400 gap-2">
								Also replies to:
								<div
									v-if="node.secondaryParentIds.length < 3"
									class="inline-block"
								>
									<span
										v-for="(
											pid, idx
										) in node.secondaryParentIds"
										:key="pid"
									>
										<a
											:href="'#' + pid"
											class="underline hover:text-gray-200 flex items-center"
										>
											<UiUserTag
												:author="nodeMap.get(pid)?.author!"
											/>
										</a>
										<span
											v-if="
												idx <
												node.secondaryParentIds.length -
													1
											"
											>,
										</span>
									</span>
								</div>
								<div v-else>
									<small class="text-sm text-gray-400">
										<button
											class="underline cursor-pointer"
											@click="toggleForwardRefs"
										>
											Also responding to
											{{
												node.secondaryParentIds.length
											}}
											other comments
										</button>
									</small>
									<ul
										v-if="showForwardRefs"
										class="list-disc list-inside text-gray-400"
									>
										<li
											v-for="pid in node.secondaryParentIds"
											:key="pid"
                                            class="my-1"
										>
											<a
												:href="'#' + pid"
												class="underline hover:text-gray-200 inline-block align-middle my-1"
											>
												<UiUserTag
													:author="nodeMap.get(pid)?.author!"
												/>
											</a>
										</li>
									</ul>
								</div>
							</small>
						</div>

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

						<!-- Back‐references (“Referenced by X other comments”) -->
						<div v-if="node.backChildrenCount">
							<small class="text-sm text-gray-400">
								<button
									class="underline"
									@click="toggleBackRefs"
								>
									Referenced by
									{{ node.backChildrenCount }} other comment
									<span v-if="node.backChildrenCount > 1"
										>s</span
									>
								</button>
							</small>
							<ul
								v-if="showBackRefs"
								class="list-disc list-inside text-gray-400"
							>
								<li
									v-for="bid in node.backChildrenIds"
									:key="bid"
								>
									<a
										:href="'#' + bid"
										class="underline hover:text-gray-200"
									>
										{{
											nodeMap.get(bid)?.author.username ||
											bid
										}}
									</a>
								</li>
							</ul>
						</div>
					</div>
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
			<div v-if="node.children.length" class="space-y-4 mt-4">
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
				/>
			</div>
		</div>
	</div>
</template>
