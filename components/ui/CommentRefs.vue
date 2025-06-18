<script lang="ts" setup>
export type Ref = {
	id: string;
	author: { username: string; avatarUrl: string };
};

const { refs, direction } = defineProps<{
	refs: Ref[];
	direction: "forward" | "backward";
}>();

const showRefs = ref(false);
const toggleShowRefs = () => {
	showRefs.value = !showRefs.value;
};
</script>

<template>
	<div v-if="refs.length">
		<small class="flex text-sm text-gray-400 gap-2">
			<div v-if="refs.length < 3" class="flex gap-2 items-center">
				{{
					direction === "forward"
						? "Also replies to:"
						: "Also referenced by:"
				}}
				<span v-for="(ref, idx) in refs" :key="ref.id" class="flex">
					<UiCommentRef :reference="ref" />
					<span v-if="idx < refs.length - 1">, </span>
				</span>
			</div>
			<div v-else>
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
				<ul v-if="showRefs" class="list-disc list-inside text-gray-400">
					<li v-for="ref in refs" :key="ref.id" class="my-1">
						<UiCommentRef :reference="ref" />
					</li>
				</ul>
			</div>
		</small>
	</div>
</template>
