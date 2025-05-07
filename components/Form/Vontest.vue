<script setup lang="ts">
const open = ref(false);

const { form, createVontest, loading } = useVontests();

const submit = async () => {
	await createVontest();
	open.value = false;
};
</script>

<template>
	<UModal title="Start a New Vontest" v-model:open="open" :overlay="true">
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
					<UTextarea
						id="description"
						v-model="form.description"
						:rows="3"
						class="w-full"
					/>
				</div>
				<UButton type="submit" :loading="loading" class="font-bold">
					Create <UIcon name="i-lucide-arrow-right" class="ml-2" />
				</UButton>
			</form>
		</template>
	</UModal>
</template>
