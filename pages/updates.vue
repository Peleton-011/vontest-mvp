<script setup lang="ts">
const { data: doc } = await useAsyncData("protected-docs", () =>
	queryCollection("updates").first()
);
</script>

<template>
	<section class="max-w-3xl mx-auto p-6 text-white">

		<UCard class="bg-neutral-800 mt-6">

			<div class="markdown-body max-w-none">
				<ContentRenderer :value="doc" v-if="doc" />
				<div v-else class="text-gray-400">Loading content...</div>
			</div>
		</UCard>
	</section>
</template>
