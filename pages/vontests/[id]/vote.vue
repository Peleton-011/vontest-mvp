<script setup lang="ts">
import { useVoting } from "~/composables/useVoting";

const route = useRoute();
const user = useSupabaseUser();
const navigateTo = useRouter().push;

const { form, submitBallot, resetForm } = useVoting();

const vontestId = route.params.id as string;
const totalPoints = ref(10);
const loading = ref(false);

const { proposals, fetchProposals } = useProposals(vontestId);

// Initialize form vontestId
form.vontestId.value = vontestId;

// votesMap for easier UI binding
const votesMap = ref<Record<string, number>>({});

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
});
</script>

<template>
	<section class="max-w-3xl mx-auto p-6 text-white">
		<h1 class="text-2xl font-bold mb-6">Distribute Your Points</h1>
		<p class="mb-4 text-gray-400">
			You have {{ totalPoints }} points. Assign them across the proposals
			below. Remaining: <strong>{{ remainingPoints }}</strong>
		</p>

		<UCard
			v-for="proposal in proposals"
			:key="proposal.id"
			class="mb-4 bg-neutral-800"
		>
			<template #header>
				<div class="text-lg font-semibold">{{ proposal.title }}</div>
			</template>

			<p class="text-sm text-gray-400">{{ proposal.description }}</p>

			<template #footer>
				<label class="text-sm text-gray-300"
					>Points: {{ votesMap[proposal.id] }}</label
				>
				<input
					v-model="votesMap[proposal.id]"
					type="range"
					min="0"
					:max="totalPoints"
					class="w-full mt-2 accent-primary-500"
				/>
			</template>
		</UCard>

		<UButton
			:disabled="remainingPoints !== 0 || loading"
			:loading="loading"
			trailing-icon="i-lucide-check-circle"
			class="font-bold"
			@click="submitVotes"
		>
			Submit Votes
		</UButton>
	</section>
</template>
