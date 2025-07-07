<script lang="ts" setup>
import { ref, computed } from "vue";
import { useSupabaseClient, useSupabaseUser } from "#imports";
import type { Database } from "~/types/supabase";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

const props = withDefaults(
	defineProps<{
		proposals: Proposal[];
		form: { votes: Ref<{ proposalId: string; value: number }[]> };
		maxVotes: number;
		minVotes?: number;
	}>(),
	{
		minVotes: 1,
	}
);

const emit = defineEmits<{
	(e: "submit"): void;
}>();

const loading = ref(false);
const allocations = ref<Record<string, number>>({});

const user = useSupabaseUser();

const totalCost = computed(() =>
	Object.values(allocations.value).reduce((sum, v) => sum + v * v, 0)
);

const canSubmit = computed(
	() => totalCost.value <= props.maxVotes && totalCost.value > props.minVotes
);

const voteSubmitted = ref(false);

const incrementVote = (id: string) => {
	allocations.value[id]++;
};

const decrementVote = (id: string) => {
	if (allocations.value[id] > 0) allocations.value[id]--;
};

const submitVotes = async () => {
	if (totalCost.value > props.minVotes) {
		alert(
			"Please use at least the minimum number of points before submitting. (" +
				props.minVotes +
				")"
		);
		return;
	} else if (totalCost.value <= props.maxVotes) {
		alert(
			"Please use at most the maximum number of points before submitting. (" +
				props.maxVotes +
				")"
		);
		return;
	}

	if (!user.value) {
		alert("You must be logged in to submit votes.");
		return;
	}

	loading.value = true;

	// Update form.votes values before submitting

	for (const [proposal, value] of Object.entries(allocations.value)) {
		if (value === 0) {
			continue;
		}

		props.form.votes.value.push({
			proposalId: proposal,
			value: value,
		});
	}

	emit("submit");

	loading.value = false;
};

watch(
	() => props.proposals,
	(newProposals) => {
		if (newProposals.length === 0) return;

		props.proposals.forEach(
			(p) => allocations.value[p.id] || (allocations.value[p.id] = 0)
		);
	}
);
</script>

<template>
	<div class="space-y-6">
		<h2 class="text-2xl font-semibold">Quadratic Voting</h2>

		<p class="text-sm text-gray-300">
			Select the number of votes you want to award to each option. <br />
			Successive votes increase point cost quadratically (1 vote = 1
			point, 2 votes = 4 points, etc.)
		</p>

		<div class="text-sm text-gray-300">
			Total Cost: {{ totalCost }} / {{ props.maxVotes }}
		</div>

		<div class="text-sm text-gray-300">
			Points Remaining: {{ props.maxVotes - totalCost }}
		</div>

		<div class="text-sm text-gray-300">
			Points Needed: {{ props.minVotes }}
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<div
				v-for="option in props.proposals"
				:key="option.id"
				class="p-4 bg-neutral-800 rounded"
			>
				<div class="font-medium text-lg">{{ option.title }}</div>
				<div class="text-sm text-gray-400">
					{{ option.description }}
				</div>

				<div class="flex items-center gap-2 mt-2">
					<UButton
						@click="decrementVote(option.id)"
						size="sm"
						variant="outline"
						>-</UButton
					>
					<span>{{ allocations[option.id] }}</span>
					<UButton @click="incrementVote(option.id)" size="sm"
						>+</UButton
					>
				</div>

				<div class="text-xs text-gray-500">
					Cost: {{ allocations[option.id] ** 2 }}
				</div>
			</div>
		</div>

		<div class="pt-4">
			<UButton
				:disabled="!canSubmit || voteSubmitted"
				color="primary"
				@click="submitVotes"
			>
				{{ voteSubmitted ? "Vote submitted!" : "Submit Votes" }}
			</UButton>
		</div>
	</div>
</template>
