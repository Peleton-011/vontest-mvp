<script setup lang="ts">
const props = defineProps<{
	to: string;
	title: string;
	description: string;
	created: string;
}>();

const container = ref<HTMLElement | null>(null);
const text = ref<HTMLElement | null>(null);

onMounted(() => {
	useTruncateHtmlText(
		container.value!,
		text.value!,
		7,
		"show less...",
		"show more..."
	);
});
</script>

<template>
	<NuxtLink :to="props.to" class="block">
		<UCard>
			<template #header>
				<div class="text-lg font-bold">{{ title }}</div>
			</template>

			<div class="-mt-4 ml-4">
				<div ref="container">
					<span
						ref="text"
						class="prose dark:prose-inverted markdown-body ql-editor pt-0 text-sm text-gray-400 border-neutral-700"
						v-html="description"
					>
					</span>
				</div>
			</div>
			<template #footer>
				<div class="flex justify-between items-center gap-2">
					<small class="text-gray-500 border-neutral-700"
						>Created
						{{ new Date(created ?? "").toLocaleString() }}</small
					>

					<div class="flex gap-2">
						<slot name="actions"></slot>
					</div>
				</div>
			</template>
		</UCard>
	</NuxtLink>
</template>
