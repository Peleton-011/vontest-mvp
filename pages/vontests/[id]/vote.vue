<script setup lang="ts">
import { useVoting } from "~/composables/useVoting";
import type { Database } from "~/types/supabase";

type VotingSettings = Database["public"]["Tables"]["voting_settings"]["Row"];

const route = useRoute();
const user = useSupabaseUser();
const navigateTo = useRouter().push;

const vontestId = route.params.id as string;
const totalPoints = ref(10);
const loading = ref(false);

const settings = ref<VotingSettings | null>(null);

const { form, submitBallot, resetForm } = useVoting(vontestId);
const { proposals, fetchProposals } = useProposals(vontestId);
const { fetchSettingFromVontestId } = useVotingSettings();

// votesMap for easier UI binding
const votesMap = ref<Record<string, number>>({});

const votingType = computed(() => settings.value?.voting_type ?? "score");

const remainingPoints = computed(() => {
	return (
		totalPoints.value -
		Object.values(votesMap.value).reduce((sum, val) => sum + Number(val), 0)
	);
});

const submitVotes = async () => {
	if (remainingPoints.value !== 0) {
		alert("Please use all points before submitting.");
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

		form.votes.value.push({
			proposalId: proposal,
			value: value,
		});
	}

	const ballot = await submitBallot();

	if (ballot) {
		alert("Votes submitted!");
		resetForm();
		navigateTo("/vontests/" + vontestId + "/results");
	} else {
		alert("There was an error submitting your votes.");
	}

	loading.value = false;
};

onMounted(async () => {
	await fetchProposals();
	proposals.value.forEach((proposal) => {
		votesMap.value[proposal.id] = 0;
	});

	const votingSetting = await fetchSettingFromVontestId(vontestId);

	if (votingSetting) {
		settings.value = votingSetting;
	}
});
</script>

<template>
	<section class="max-w-3xl mx-auto p-6 text-white">
		<div v-if="votingType === 'updown'">
			Updown
			<UiVotingUpdown
				:proposals="proposals"
				:votesMap="votesMap"
				:loading="loading"
				@submit="submitVotes"
			/>
		</div>
		<div v-else-if="votingType === 'multiple'">
			Multiple Choice (+ Approval Voting)
			<UiVotingMultiple
				:proposals="proposals"
				:minimumChoices="3"
				:maximumChoices="-1"
				:loading="loading"
				@submit="submitVotes"
			/>
		</div>
		<div v-else-if="votingType === 'score'">
			Score Voting (+ Likert)
			<UiVotingScore
				:proposals="proposals"
				:votesMap="votesMap"
				:totalPoints="totalPoints"
				:remainingPoints="remainingPoints"
				:loading="loading"
				@submit="submitVotes"
			/>
		</div>
		<div v-else-if="votingType === 'ranked'">
			Ranked Choice (Like multiple choice but order matters)
			<UiVotingRanked
				:proposals="proposals"
				:minimumChoices="3"
				:maximumChoices="-1"
				:loading="loading"
				@submit="submitVotes"
			/>
		</div>
		<div v-else-if="votingType === 'quadratic'">
			Quadratic Voting
			<UiVotingQuadratic
				:proposals="proposals"
				:vontestId="vontestId"
				:totalCredits="5"
			/>
		</div>
		<div v-else-if="votingType === 'single'">
			Single Voting
			<UiVotingSingle
				:proposals="proposals"
				:loading="loading"
				@submit="submitVotes"
			/>
		</div>
		<div v-else-if="votingType === 'likert'">Likert</div>

		<h1 class="text-2xl font-bold mb-6">Distribute Your Points</h1>
		<p class="mb-4 text-gray-400">
			You have {{ totalPoints }} points. Assign them across the proposals
			below. Remaining: <strong>{{ remainingPoints }}</strong>
		</p>
	</section>
</template>
