<script lang="ts" setup>
const props = defineProps<{
	newCommentText: string;
	newCommentParents: string[];
}>();

// Computed getter/setter for this node’s comment text
const localCommentText = computed<string>({
	get: () => {
		return props.newCommentText || "";
	},
	set: (val: string) => {
		emit("update:comment-text", val);
	},
});

const emit = defineEmits<{
	(e: "update:comment-text", payload: string): void;
	(e: "update:comment-parents", parents: string[]): void;
	(e: "post-comment" | "cancel"): void;
}>();

const open = ref(false);
</script>

<template>
	<UDrawer
		:overlay="false"
		:modal="false"
		should-scale-background
		:set-background-color-on-scale="false"
		v-model:open="open"
		inset
	>
		<UButton
			label="Open"
			color="neutral"
			variant="subtle"
			trailing-icon="i-lucide-chevron-up"
			@click="open.value = !open.value"
		/>

		<template #content>
			<div class="p-4 grid grid-cols-3">
				<div class="col-span-2 flex flex-col">
					<ClientOnly>
						<!-- class="w-full rounded-[calc(var(--ui-radius)*1.5)] border-0 placeholder:text-(--ui-text-dimmed) focus:outline-none disabled:cursor-not-allowed disabled:opacity-75 transition-colors px-2.5 py-1.5 text-sm gap-1.5 text-(--ui-text-highlighted) bg-(--ui-bg) ring ring-inset ring-(--ui-border-accented) focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[--ui-primary]" -->
						<MdEditor
							id="description"
							v-model="localCommentText"
			
						/>
					</ClientOnly>
				</div>
				<div class="col-span-1 p-2">
					<div class="bg-neutral-700"></div>
				</div>
			</div>
		</template>

		<template #footer>
            <div class="flex justify-between mt-2">
                aaaa
				<UButton
					label="Post"
					:disabled="!localCommentText.value.trim()"
					@click="
						emit('post-comment');
						open.value = false;
					"
				/>
				<UButton
					label="Cancel"
					variant="subtle"
					@click="
						emit('cancel');
						open.value = false;
					"
				/>
			</div>
		</template>
	</UDrawer>
</template>
