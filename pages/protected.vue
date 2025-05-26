<script setup lang="ts">
const { data: docs } = await useAsyncData("protected-docs", () =>
	queryCollection("docs").order("date", "DESC").all()
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

		<UCard v-for="doc in docs" :key="doc.id" class="bg-neutral-800 mt-6">
			<div class="markdown-body max-w-none">
				<ContentRenderer :value="doc" />
			</div>
		</UCard>
		<UCard v-if="!docs" class="bg-neutral-800 mt-6">
			<div class="markdown-body max-w-none text-gray-400">
				Loading content...
			</div>
		</UCard>
	</section>
</template>
