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
}>();

const emit = defineEmits<{
	(
		e: "update:comment-text" | "delete-comment" | "edit-comment",
		payload: string
	): void;
	(e: "update:comment-parents", parents: string[]): void;
	(e: "post-comment" | "post-update"): void;
}>();

const user = useSupabaseUser();

const isEditing = ref(false);

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
	<div
		:id="node.id"
		:style="{ marginLeft: (depth || 0) + 'rem' }"
		class="space-y-2"
	>
		<UCard>
			<template #header>
				<div class="flex items-center justify-between">
					<div class="flex items-center mb-1">
						<img
							v-if="node.author.avatarUrl"
							:src="node.author.avatarUrl"
							class="w-6 h-6 rounded-full mr-2"
						/>
						<span class="font-medium">{{
							node.author.username
						}}</span>
						<small class="text-gray-500 ml-2">
							• {{ node.createdAt.toLocaleString() }}
						</small>
					</div>
					<OptionsDropdown
						v-if="node.author.id === user?.id"
						@edit="
							emit('edit-comment', node.id);
							isEditing = true;
                            console.log(node)
						"
						@delete="emit('delete-comment', node.id)"
					/>
				</div>
			</template>

			<p v-if="!isEditing" class="text-gray-300">{{ node.comment }}</p>
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
						@click="
							emit('post-update');
							isEditing = false;
						"
					/>
					<UButton
						label="Cancel"
						variant="subtle"
						@click="
							isEditing = false;
							emit('update:comment-text', '');
						"
					/>
				</div>
			</div>

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
		</UCard>

		<div v-if="newCommentParents[0] === node.id && !isEditing" class="mb-4">
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
			/>
		</div>
	</div>
</template>
