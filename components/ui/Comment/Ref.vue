<script lang="ts" setup>
import type { Ref } from "./Refs.vue";
const { reference, short } = defineProps<{
	reference: Ref;
    short?: boolean
}>();

const emit = defineEmits<{
	(e: "activate-reference", payload: string): void;
}>();

const { author, comment } = reference;
</script>

<template>
	<UPopover mode="hover">
		<UButton
			variant="link"
			class="underline !hover:text-gray-200 inline-block align-middle cursor-pointer"
			@click="emit('activate-reference', reference.id)"
		>
			<UiUserTag :author="short ? {...author, username: ''} : author" />
		</UButton>

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
