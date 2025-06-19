<script lang="ts" setup>
import type { Database } from "~/types/supabase";

const props = defineProps<{
	proposals: Database["public"]["Tables"]["proposals"]["Row"][];
	vontestId: string;
	minChoices?: number;
	maxChoices?: number;
	delayedResults?: boolean;
}>();

const user = useSupabaseUser();

const selectedOptionIds = ref<string[]>([]);
const voteSubmitted = ref(false);

const selectOption = (id: string) => {
	if (selectedOptionIds.value.includes(id)) {
		selectedOptionIds.value = selectedOptionIds.value.filter(
			(optionId) => optionId !== id
		);
	} else if (
		selectedOptionIds.value.length <
		(props.maxChoices || useProposals.length)
	) {
		selectedOptionIds.value.push(id);
	}
};

const submitVote = async () => {
	if (!selectedOptionId.value || voteSubmitted.value || !user.value) return;

	const { error } = await useSupabaseClient<Database>().from("votes").insert({
		user_id: user.value.id,
		proposal_id: selectedOptionId.value,
		vontest_id: props.vontestId,
		points: 1, // optional depending on your schema
	});

	if (error) {
		console.error("Error submitting vote:", error);
		return;
	}

	voteSubmitted.value = true;
};
</script>

<template>
	<div class="space-y-6">
		<h2 class="text-2xl font-semibold">Make your choice</h2>

		<!-- Choice buttons -->
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<UButton
				v-for="option in props.proposals"
				:key="option.id"
				:color="selectedOptionId === option.id ? 'primary' : 'neutral'"
				variant="solid"
				class="w-full text-left p-4"
				@click="selectOption(option.id)"
			>
				<div class="font-medium text-lg">
					{{ option.title }}
				</div>
				<div v-if="option.description" class="text-sm text-gray-300">
					{{ option.description }}
				</div>
			</UButton>
		</div>

		<!-- Submit button -->
		<div class="pt-4">
			<UButton
				:disabled="!selectedOptionId || voteSubmitted"
				color="primary"
				@click="submitVote"
			>
				{{ voteSubmitted ? "Vote submitted!" : "Submit Vote" }}
			</UButton>
		</div>
	</div>
</template>
