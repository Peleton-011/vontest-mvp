<script setup lang="ts">
const open = ref(false);

const { form, createVontest, loading } = useVontests();

const submit = async () => {
	await createVontest();
	open.value = false;
};
</script>

<template>
	<UModal title="Start a New Vontest" v-model:open="open" :overlay="true" id="modal">
		<UButton
			label="New Vontest"
			color="primary"
			variant="subtle"
			@click="open = true"
		/>
		<template #body>
			<form @submit.prevent="submit" class="space-y-4">
				<div>
					<label for="title" class="block text-sm mb-1"
						>Question</label
					>
					<UInput
						id="title"
						v-model="form.title"
						placeholder="What’s the best way to reduce urban noise?"
						required
						class="w-full"
					/>
				</div>
				<div>
					<label for="description" class="block text-sm mb-1"
						>Context (optional)</label
					>
					<ClientOnly>
                        <!-- class="w-full rounded-[calc(var(--ui-radius)*1.5)] border-0 placeholder:text-(--ui-text-dimmed) focus:outline-none disabled:cursor-not-allowed disabled:opacity-75 transition-colors px-2.5 py-1.5 text-sm gap-1.5 text-(--ui-text-highlighted) bg-(--ui-bg) ring ring-inset ring-(--ui-border-accented) focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[--ui-primary]" -->
                        <MdEditor
                        v-model:contentMarkdown="form.description"
                        id="description"
						/>
                    </ClientOnly>
				</div>
				<UButton type="submit" :loading="loading" class="font-bold">
					Create <UIcon name="i-lucide-arrow-right" class="ml-2" />
				</UButton>
			</form>
		</template>
	</UModal>
</template>
