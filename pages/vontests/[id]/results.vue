<script setup lang="ts">
import type { PostgrestResponse } from "@supabase/supabase-js";
import type { Database } from "~/types/supabase";

const route = useRoute();
const user = useSupabaseUser();
const supabase = useSupabaseClient<Database>();

type ProposalSummary = {
	id: string;
	title: string | null;
	score?: number;
};

type VoteSummary = {
	proposal_id: string | null;
	points: number | null;
};

const vontestId = route.params.id as string;
const proposals = ref<ProposalSummary[]>([]);

const fetchResults = async () => {
	const { data, error }: PostgrestResponse<VoteSummary> = await supabase
		.from("votes")
		.select("proposal_id, points")
		.eq("vontest_id", vontestId);

	if (error) {
		console.error(error);
		return;
	}

	const totals = new Map();
	for (const vote of data) {
		const prev = totals.get(vote.proposal_id) || 0;
		totals.set(vote.proposal_id, prev + vote.points);
	}

	const { data: proposalData }: PostgrestResponse<ProposalSummary> =
		await supabase
			.from("proposals")
			.select("id, title")
			.eq("vontest_id", vontestId);

	proposals.value = proposalData
		? proposalData
				.map((p) => ({
					...(p as any),
					score: totals.get(p.id) || 0,
				}))
				.sort((a, b) => b.score - a.score)
		: [];
};

onMounted(fetchResults);
</script>

<template>
	<section class="max-w-3xl mx-auto p-6 text-white">
		<h1 class="text-2xl font-bold mb-6">Voting Results</h1>

		<div v-if="proposals.length">
			<div
				v-for="(proposal, index) in proposals"
				:key="proposal.id"
				class="mb-4 bg-neutral-800 p-4 rounded shadow"
			>
				<div class="flex justify-between items-center mb-2">
					<span class="text-lg font-semibold">{{
						proposal.title
					}}</span>
					<span class="text-primary-400 font-bold"
						>{{ proposal.score }} pts</span
					>
				</div>

				<div class="w-full h-4 bg-neutral-700 rounded">
					<div
						class="h-full bg-primary-500 rounded transition-all"
						:style="{
							width:
								proposals && proposals[0] && proposals[0].score && proposal.score
									? (proposal.score / proposals[0].score) *
											100 +
									  '%'
									: '0%',
						}"
					/>
				</div>
			</div>
		</div>

		<div v-else class="text-gray-400">No votes have been cast yet.</div>
	</section>
</template>
