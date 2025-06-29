<script lang="ts" setup>
import type { Ref } from "../Comment/Refs.vue";
const props = defineProps<{

	newCommentParents: string[];
	parentRefs: Ref[];
}>();

const localCommentText = defineModel("newCommentText", {
	type: String,
	required: true,
});

const emit = defineEmits<{
	(e:  "activate-reference", payload: string): void;
	(e: "update:comment-parents", parents: string[]): void;
	(e: "post-comment" | "cancel" | "toggle-editor"): void;
}>();

const handleDeleteRef = (id: string) => {
	const newCommentParents = props.newCommentParents.filter(
		(toRemove) => id !== toRemove
	);
	emit("update:comment-parents", newCommentParents);
};
</script>
<template>
	<div class="flex flex-col p-4 h-1/3">
		<!-- Body -->
		<div class="flex items-stretch">
			<div class="flex flex-col w-2/3">
				<ClientOnly>
					<!-- class="w-full rounded-[calc(var(--ui-radius)*1.5)] border-0 placeholder:text-(--ui-text-dimmed) focus:outline-none disabled:cursor-not-allowed disabled:opacity-75 transition-colors px-2.5 py-1.5 text-sm gap-1.5 text-(--ui-text-highlighted) bg-(--ui-bg) ring ring-inset ring-(--ui-border-accented) focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[--ui-primary]" -->
					<MdEditor
						id="description"
						v-model="localCommentText"
						class="flex flex-grow"
					/>
				</ClientOnly>
			</div>
			<div class="p-2 w-1/3 flex flex-col justify-between">
				<div >
					<div class="flex justify-between">
						<h2 class="text-lg font-semibold mb-2">Replying To:</h2>
						<UiCommentEditorOptions
							:is-advanced="true"
							@toggle-editor="emit('toggle-editor')"
						/>
					</div>
					<div>
						<UiCommentRefsList
                        v-if="parentRefs.length"
							:refs="parentRefs"
							@remove-ref="handleDeleteRef"
                            @activate-reference="emit('activate-reference', $event)"
						/>
                        <ul v-else class="text-gray-400">
                            <li class="my-1 list-disc ml-8">
                                No one yet...
                            </li>
                        </ul>
					</div>
				</div>
				<div class="flex justify-around gap-2">
					<UButton
						class="w-1/2 justify-between"
						label="Post"
						trailing-icon="i-lucide-upload"
						:disabled="!localCommentText.trim()"
						@click="emit('post-comment')"
					/>
					<UButton
						class="w-1/2 justify-between"
						label="Cancel"
						trailing-icon="i-lucide-x"
						variant="subtle"
						@click="emit('cancel')"
					/>
				</div>
			</div>
		</div>
	</div>
</template>
