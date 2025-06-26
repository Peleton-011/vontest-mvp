<script lang="ts" setup>

const content = ref("")

</script>

<template>
	<UDrawer
		:overlay="false"
		:modal="false"
		should-scale-background
		:set-background-color-on-scale="false"
		inset
	>
		<UButton
			label="Open"
			color="neutral"
			variant="subtle"
			trailing-icon="i-lucide-chevron-up"
		/>

		<template #content>
			<div class="p-4 grid grid-cols-3">
				<div class="col-span-2">
					<ClientOnly>
						<!-- class="w-full rounded-[calc(var(--ui-radius)*1.5)] border-0 placeholder:text-(--ui-text-dimmed) focus:outline-none disabled:cursor-not-allowed disabled:opacity-75 transition-colors px-2.5 py-1.5 text-sm gap-1.5 text-(--ui-text-highlighted) bg-(--ui-bg) ring ring-inset ring-(--ui-border-accented) focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[--ui-primary]" -->
						<MdEditor id="description" v-model="content.value" />
					</ClientOnly>
				</div>
				<div class="col-span-1">
					<Placeholder />
				</div>
			</div>
		</template>
	</UDrawer>
</template>

