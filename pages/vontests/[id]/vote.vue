<script setup lang="ts">
import type { PostgrestResponse } from "@supabase/supabase-js";
import type { Database } from "~/types/supabase";

const route = useRoute();
const user = useSupabaseUser();
const supabase = useSupabaseClient<Database>();

type ProposalSummary = {
    id: string;
    title: string | null;
    description: string | null;
    score?: number;
};

export interface VotePayload {
	vontest_id: string;
	proposal_id: string;
	user_id: string;
	points: number;
}

const vontestId = route.params.id as string;
const proposals = ref<ProposalSummary[]>([]);
const votes = ref<Record<string, number>>({});
const totalPoints = ref(10);

const loading = ref(false);

const fetchProposals = async () => {
	const { data, error }: PostgrestResponse<ProposalSummary> = await supabase
		.from("proposals")
		.select("id, title, description")
		.eq("vontest_id", vontestId);
	if (!error) {
		console.log(data);
		proposals.value = data;
		// Init votes with 0
		data.forEach((p) => (votes.value[p.id] = 0));
	}
};

const remainingPoints = computed(
	() =>
		totalPoints.value -
		Object.values(votes.value).reduce((sum, val) => sum + Number(val), 0)
);

const submitVotes = async () => {
	if (remainingPoints.value !== 0) {
		alert("Please use all points before submitting.");
		return;
	}

	loading.value = true;

	const payload: VotePayload[] = Object.entries(votes.value).map(
		([proposal_id, points]) => ({
			vontest_id: vontestId,
			proposal_id,
			user_id: user.value?.id!,
			points,
		})
	);

    const { error } = await supabase.from('votes').upsert(payload, {
    onConflict: 'user_id,proposal_id',
  })

	if (error) alert(error.message);
	else alert("Votes submitted!");

    navigateTo('/vontests/' + vontestId + '/results');

	loading.value = false;
};

onMounted(fetchProposals);
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
					>Points: {{ votes[proposal.id] }}</label
				>
				<input
					type="range"
					min="0"
					:max="totalPoints"
					v-model="votes[proposal.id]"
					class="w-full mt-2 accent-primary-500"
				/>
			</template>
		</UCard>

		<UButton
			:disabled="remainingPoints !== 0 || loading"
			@click="submitVotes"
			:loading="loading"
			trailing-icon="i-lucide-check-circle"
			class="font-bold"
		>
			Submit Votes
		</UButton>
	</section>
</template>
