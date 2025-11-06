<script setup lang="ts">
const props = defineProps<{
	vontestId: string;
}>();

const open = ref(false);
const { form, submitProposal, loading } = useProposals(props.vontestId);

const submit = async () => {
	const newProposal = await submitProposal();

	if (newProposal) {
		navigateTo(`/proposals/${props.vontestId}/${newProposal?.id}`);
	}
};
</script>

<template>
	<div>
		<UButton
			label="New Proposal"
			variant="subtle"
			block
			@click="open = true"
		/>
		<UModal v-model:open="open" title="Submit a Proposal">
			<template #body>
				<form class="space-y-4" @submit.prevent="submit">
					<div>
						<label for="title" class="block text-sm mb-1"
							>Title</label
						>
						<UInput
							id="title"
							v-model="form.title.value"
							required
							class="w-full"
						/>
					</div>
					<div>
						<label for="desc" class="block text-sm mb-1"
							>Description</label
						>
						<UTextarea
							id="desc"
							v-model="form.description.value"
							:rows="3"
							class="w-full"
						/>
					</div>
					<div class="flex w-full justify-between">
						<NuxtLink :to="'/proposals/' + props.vontestId + '/new/'">
							<UButton
								variant="subtle"
								class="font-bold"
								icon="i-lucide-edit"
								>Full editor</UButton
							>
						</NuxtLink>
						<UButton
							type="submit"
							:loading="loading"
							class="font-bold"
						>
							Submit
							<UIcon name="i-lucide-send" class="ml-2" />
						</UButton>
					</div>
				</form>
			</template>
		</UModal>
	</div>
</template>
