<script lang="ts" setup>
import { ref, computed } from "vue";
import { useSupabaseClient, useSupabaseUser } from "#imports";
import type { Database } from "~/types/supabase";

const props = defineProps<{
	proposals: Database["public"]["Tables"]["proposals"]["Row"][];
	vontestId: string;
	totalCredits: number;
}>();

const user = useSupabaseUser();
const supabase = useSupabaseClient<Database>();

const allocations = ref<Record<string, number>>({});
props.proposals.forEach((p) => (allocations.value[p.id] = 0));

const emit = defineEmits<{
	(e: "submit-votes", allocations: Record<string, number>): void;
}>();

const totalCost = computed(() =>
	Object.values(allocations.value).reduce((sum, v) => sum + v * v, 0)
);

const canSubmit = computed(
	() => totalCost.value <= props.totalCredits && totalCost.value > 0
);

const voteSubmitted = ref(false);

const incrementVote = (id: string) => {
	allocations.value[id]++;
};

const decrementVote = (id: string) => {
	if (allocations.value[id] > 0) allocations.value[id]--;
};

const submitVotes = async () => {
	if (!canSubmit.value || !user.value) return;

	emit("submit-votes", allocations.value);
};
</script>

<template>
	<div class="space-y-6">
		<h2 class="text-2xl font-semibold">Quadratic Voting</h2>

		<div class="text-sm text-gray-300">
			Total Cost: {{ totalCost }} / {{ props.totalCredits }}
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
