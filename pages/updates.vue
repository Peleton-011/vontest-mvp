<script setup lang="ts">
const { data: docs } = await useAsyncData("protected-docs", () =>
	queryCollection("updates").order("title", "DESC").all()


);
</script>

<template>
	<section class="max-w-3xl mx-auto p-6 text-white">
		<UCard v-if="docs" class="bg-neutral-800 mt-6" v-for="doc in docs">
			<div class="markdown-body max-w-none">
				<ContentRenderer :value="doc" />
			</div>
		</UCard>
		<UCard v-else class="bg-neutral-800 mt-6">
			<div class="markdown-body max-w-none text-gray-400">
				Loading content...
			</div>
		</UCard>
	</section>
</template>
