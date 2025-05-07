<script setup lang="ts">
const props = defineProps<{
	vontestId: string;
}>();

const open = ref(false);
const { form, submitProposal, loading, error } = useProposals(props.vontestId);

const submit = async () => {
	await submitProposal();
	if (!error) open.value = false;
};
</script>

<template>
	<div>
		<UButton label="New Proposal" variant="subtle" @click="open = true" />
		<UModal title="Submit a Proposal" v-model:open="open">
			<template #body>
				<form @submit.prevent="submit" class="space-y-4">
					<div>
						<label for="title" class="block text-sm mb-1">Title</label>
						<UInput id="title" v-model="form.title" required class="w-full" />
					</div>
					<div>
						<label for="desc" class="block text-sm mb-1">Description</label>
						<UTextarea id="desc" v-model="form.description" :rows="3" class="w-full" />
					</div>
					<UButton type="submit" :loading="loading" class="font-bold">
						Submit
						<UIcon name="i-lucide-send" class="ml-2" />
					</UButton>
				</form>
			</template>
		</UModal>
	</div>
</template>