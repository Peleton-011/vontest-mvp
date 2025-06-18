<script lang="ts" setup>
import type { Ref } from "./CommentRefs.vue";
const { reference } = defineProps<{
	reference: Ref;
}>();

const { author, comment } = reference;
</script>

<template>
	<UPopover mode="hover">
		<a
			:href="'#' + reference.id"
			class="underline hover:text-gray-200 inline-block align-middle my-1"
		>
			<UiUserTag :author="reference.author" />
		</a>

		<template #content>
			<div class="p-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center mb-1">
						<UiUserTag v-if="author" :author="author" />
						<small class="text-gray-500 ml-2">
							• {{ comment.createdAt.toLocaleString() }}
						</small>
					</div>
				</div>

				<p class="text-gray-300">
					{{ comment.text }}
				</p>
			</div>
		</template>
	</UPopover>
</template>
