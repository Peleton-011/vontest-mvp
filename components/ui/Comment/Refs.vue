<script lang="ts" setup>
export type Ref = {
	id: string;
	author: { username: string; avatarUrl: string };
	comment: { text: string; createdAt: Date };
};

const { refs, direction } = defineProps<{
	refs: Ref[];
	direction: "forward" | "backward" | "editor";
}>();

const emit = defineEmits<{
	(e: "activate-reference" | "remove-ref", payload: string): void;
}>();

const showRefs = ref(false);
const toggleShowRefs = () => {
	showRefs.value = !showRefs.value;
};
</script>

<template>
	<div v-if="refs.length">
		<small class="flex text-sm text-gray-400 gap-2">
			<div
				v-if="
					(refs.length < 4 && direction !== 'editor') ||
					refs.length < 6
				"
				class="flex gap-2 items-center"
			>
				{{
					direction === "forward"
						? "Also replies to:"
						: direction === "backward"
							? "Also referenced by:"
							: ""
				}}
				<span v-for="(ref, idx) in refs" :key="ref.id" class="flex">
					<UiCommentRef
						:reference="ref"
						:short="direction === 'editor'"
						@activate-reference="emit('activate-reference', $event)"
					/>
					<span
						v-if="idx < refs.length - 1"
						class="flex items-center -mx-2"
						>,
					</span>
				</span>
			</div>
			<div v-else-if="direction !== 'editor'">
				<small class="text-sm text-gray-400">
					<button
						class="underline cursor-pointer"
						@click="toggleShowRefs"
					>
						{{
							direction === "forward"
								? "Also responding to"
								: "Also referenced by"
						}}
						{{ refs.length }}
						other comments
					</button>
				</small>
				<UiCommentRefsList
					v-if="showRefs"
					:refs="refs"
					@remove-ref="emit('remove-ref', $event)"
					@activate-reference="emit('activate-reference', $event)"
				/>
			</div>
			<div v-else class="flex gap-2 items-center">
                <span v-for="(ref, idx) in refs.slice(0, 5)" :key="ref.id" class="flex">
					<UiCommentRef
						:reference="ref"
						:short="direction === 'editor'"
						@activate-reference="emit('activate-reference', $event)"
					/>
					<span
						v-if="idx < refs.length - 1"
						class="flex items-center -mx-2"
						>,
					</span>
				</span>
				<UiCommentRefsDropdown
					:refs="refs"
					@remove-ref="emit('remove-ref', $event)"
					@activate-reference="emit('activate-reference', $event)"
				>
					<button class="underline cursor-pointer ml-4 ">
						And {{ refs.length - 5 }} more . . . 
					</button>
				</UiCommentRefsDropdown>
			</div>
		</small>
	</div>
</template>
