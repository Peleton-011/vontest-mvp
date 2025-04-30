<script setup lang="ts">
const { data: doc } = await useAsyncData("protected-docs", () =>
	queryCollection("docs").first()
);

definePageMeta({
	middleware: ["auth"],
});
</script>

<template>
	<section class="max-w-3xl mx-auto p-6 text-white">
		<UCard class="bg-neutral-800">
			<template #header>
				<h1 class="text-2xl font-bold">Protected Page</h1>
			</template>
			<p class="text-gray-400">
				This page is only accessible to authorized users. Below is
				content that can be managed independently as markdown.
			</p>
		</UCard>

		<UCard class="bg-neutral-800 mt-6">
			<template #header>
				<div class="text-lg font-semibold">Markdown Content</div>
			</template>

			<div class="prose prose-invert max-w-none">
				<ContentRenderer :value="doc" v-if="doc" />
				<div v-else class="text-gray-400">Loading content...</div>
			</div>
		</UCard>
	</section>
</template>
