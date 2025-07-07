<script setup lang="ts">
import { useVoting } from "~/composables/useVoting";
import type { Database } from "~/types/supabase";

type VotingSettings = Database["public"]["Tables"]["voting_settings"]["Row"];

const route = useRoute();
const user = useSupabaseUser();
const navigateTo = useRouter().push;

const vontestId = route.params.id as string;

const settings = ref<VotingSettings | null>(null);

const { form, submitBallot, resetForm } = useVoting(vontestId);
const { proposals, fetchProposals } = useProposals(vontestId);
const { fetchSettingFromVontestId } = useVotingSettings();

const votingType = computed(() => settings.value?.voting_type ?? "score");

const onBallotCast = async () => {
	const ballot = await submitBallot();

	if (ballot) {
		alert("Votes submitted!");
		resetForm();
		navigateTo("/vontests/" + vontestId + "/results");
	} else {
		alert("There was an error submitting your votes.");
	}
};

onMounted(async () => {
	await fetchProposals();

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
				:form="{ votes: form.votes }"
				@submit="onBallotCast"
			/>
		</div>
		<div v-else-if="votingType === 'multiple'">
			Multiple Choice (+ Approval Voting)
			<UiVotingMultiple
				:proposals="proposals"
				:form="{ votes: form.votes }"
				:minimumChoices="settings?.min_votes ?? 3"
				:maximumChoices="settings?.max_votes ?? -1"
				@submit="onBallotCast"
			/>
		</div>
		<div v-else-if="votingType === 'score'">
			Score Voting (+ Likert)
			<UiVotingScore
				:proposals="proposals"
				:form="{ votes: form.votes }"
				:maxVotes="settings?.max_votes ?? 10"
				:minVotes="settings?.min_votes ?? 10"
				@submit="onBallotCast"
			/>
		</div>
		<div v-else-if="votingType === 'ranked'">
			Ranked Choice (Like multiple choice but order matters)
			<UiVotingRanked
				:proposals="proposals"
				:form="{ votes: form.votes }"
				:minimumChoices="3"
				:maximumChoices="-1"
				@submit="onBallotCast"
			/>
		</div>
		<div v-else-if="votingType === 'quadratic'">
			Quadratic Voting
			<UiVotingQuadratic
				:proposals="proposals"
				:form="{ votes: form.votes }"
				:maxVotes="settings?.max_votes ?? 10"
				:minVotes="settings?.min_votes ?? 1"
                @submit="onBallotCast"
			/>
		</div>
		<div v-else-if="votingType === 'single'">
			Single Voting
			<UiVotingSingle
				:proposals="proposals"
				:form="{ votes: form.votes }"
				@submit="onBallotCast"
			/>
		</div>
		<div v-else-if="votingType === 'likert'">Likert</div>
	</section>
</template>
