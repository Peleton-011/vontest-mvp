<script lang="ts" setup>
import type { Database } from "~/types/supabase";
import DOMPurify from "dompurify";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

const props = withDefaults(
	defineProps<{
		proposals: Proposal[];
		form: Ref<{ votes: { proposalId: string; value: number }[] }>;
		maxVotes: number;
		minVotes?: number;
	}>(),
	{
		minVotes: 1,
	}
);

const emit = defineEmits<{
	(e: "ballot-cast"): void;
}>();

// votesMap for easier UI binding
const votesMap = ref<Record<string, number>>({});
const loading = ref(false);

const user = useSupabaseUser();

const pointsCast = computed(() => {
	return Object.values(votesMap.value).reduce(
		(sum, val) => sum + Number(val),
		0
	);
});

const submitVotes = async () => {
	if (props.minVotes && pointsCast.value < props.minVotes) {
		alert(
			"Please use at least the minimum number of points before submitting. (" +
				props.minVotes +
				")"
		);
		return;
	} else if (props.maxVotes && pointsCast.value > props.maxVotes) {
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

	for (const [proposal, value] of Object.entries(votesMap.value)) {
		if (value === 0) {
			continue;
		}

		props.form.value.votes.push({
			proposalId: proposal,
			value: value,
		});
	}

	emit("ballot-cast");

	loading.value = false;
};

onMounted(() => {
	props.proposals.forEach((proposal) => {
		votesMap.value[proposal.id] = 0;
	});
});
</script>

<template>
	<div>
		<h1 class="text-2xl font-bold mb-6">Distribute Your Points</h1>
		<p v-if="props.maxVotes" class="mb-4 text-gray-400">
			You have {{ props.maxVotes }} points. Assign them across the
			proposals below. Remaining:
			<strong>{{ props.maxVotes - pointsCast }}</strong>
		</p>
		<p v-if="props.minVotes" class="mb-4 text-gray-400">
			You must assign at least {{ props.minVotes }} points to cast your
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
					:max="maxVotes"
					class="w-full mt-2 accent-primary-500"
				/>
			</template>
		</UCard>

		<UButton
			:disabled="
				loading || pointsCast < minVotes || pointsCast > maxVotes
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
