<script lang="ts" setup>
type Ref = {
	id: string;
	author: { username: string; avatarUrl: string };
};

const { refs } = defineProps<{
	refs: Ref[];
	direction: "forward" | "backward";
}>();

const showForwardRefs = ref(false);
const toggleForwardRefs = () => {
	showForwardRefs.value = !showForwardRefs.value;
};
</script>

<template>
	<div v-if="refs.length">
		<small class="flex text-sm text-gray-400 gap-2">
			<div v-if="refs.length < 3" class="flex gap-2">
				{{
					direction === "forward"
						? "Also replies to:"
						: "Also referenced by:"
				}}
				<span v-for="(ref, idx) in refs" :key="ref.id" class="flex">
					<a
						:href="'#' + ref.id"
						class="underline hover:text-gray-200 flex items-center"
					>
						<UiUserTag :author="ref.author" />
					</a>
					<span v-if="idx < refs.length - 1">, </span>
				</span>
			</div>
			<div v-else>
				<small class="text-sm text-gray-400">
					<button
						class="underline cursor-pointer"
						@click="toggleForwardRefs"
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
				<ul
					v-if="showForwardRefs"
					class="list-disc list-inside text-gray-400"
				>
					<li v-for="ref in refs" :key="ref.id" class="my-1">
						<a
							:href="'#' + ref.id"
							class="underline hover:text-gray-200 inline-block align-middle my-1"
						>
							<UiUserTag :author="ref.author" />
						</a>
					</li>
				</ul>
			</div>
		</small>
	</div>
</template>
