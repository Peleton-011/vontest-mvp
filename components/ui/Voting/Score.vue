<script lang="ts" setup>
import type { Database } from "~/types/supabase";
import DOMPurify from "dompurify";

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

const localMinVotes =
	props.minVotes === -1 ? props.proposals.length : props.minVotes;
const localMaxVotes =
	props.maxVotes === -1 ? props.proposals.length : props.maxVotes;

const emit = defineEmits<{
	(e: "submit"): void;
}>();

// votesMap for easier UI binding
const votesMap = ref<Record<string, number>>(
	Object.fromEntries(props.proposals.map((p) => [p.id, 0]))
);
const loading = ref(false);

const user = useSupabaseUser();

const pointsCast = computed(() => {
	return Object.values(votesMap.value).reduce(
		(sum, val) => sum + Number(val),
		0
	);
});

const submitVotes = async () => {
	if (localMinVotes && pointsCast.value < localMinVotes) {
		alert(
			"Please use at least the minimum number of points before submitting. (" +
				localMinVotes +
				")"
		);
		return;
	} else if (localMaxVotes && pointsCast.value > localMaxVotes) {
		alert(
			"Please use at most the maximum number of points before submitting. (" +
				localMaxVotes +
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

	for (const [proposal, value] of Object.entries(votesMap.value)) {
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
</script>

<template>
	<div>
		<h1 class="text-2xl font-bold mb-6">Distribute Your Points</h1>
		<p v-if="localMaxVotes" class="mb-4 text-gray-400">
			You have {{ localMaxVotes }} points. Assign them across the
			proposals below. Remaining:
			<strong>{{ localMaxVotes - pointsCast }}</strong>
		</p>
		<p v-if="localMinVotes" class="mb-4 text-gray-400">
			You must assign at least {{ localMinVotes }} points to cast your
			ballot.
		</p>
		<UCard
			v-if="votesMap"
			v-for="proposal in proposals"
			:key="proposal.id"
			class="mb-4 bg-neutral-800"
		>
			<template #header>
				<div class="text-lg font-semibold">{{ proposal.title }}</div>
			</template>

			<p
				class="text-sm text-gray-400"
				v-html="DOMPurify.sanitize(proposal.description!)"
			/>

			<template #footer>
				<label class="text-sm text-gray-300"
					>Points: {{ votesMap[proposal.id] }}</label
				>
				<input
					v-model="votesMap[proposal.id]"
					type="range"
					min="0"
					:max="localMaxVotes"
					class="w-full mt-2 accent-primary-500"
				/>
			</template>
		</UCard>

		<UButton
			:disabled="
				loading ||
				pointsCast < localMinVotes ||
				pointsCast > localMaxVotes
			"
			:loading="loading"
			trailing-icon="i-lucide-check-circle"
			class="font-bold"
			@click="submitVotes"
		>
			Submit Votes
		</UButton>
	</div>
</template>
