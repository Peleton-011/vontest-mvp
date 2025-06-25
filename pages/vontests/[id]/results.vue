<script setup lang="ts">
import type { PostgrestResponse } from "@supabase/supabase-js";
import type { Database } from "~/types/supabase";

import DOMPurify from "dompurify";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

const route = useRoute();
const supabase = useSupabaseClient<Database>();

type ProposalSummary = {
	id: string;
	title: string | null;
	description: string | null;
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
			.select("id, title, description")
			.eq("vontest_id", vontestId);

	proposals.value = proposalData
		? proposalData
				.map((p) => ({
					...(p as Proposal),
					score: totals.get(p.id) || 0,
				}))
				.sort((a, b) => b.score - a.score)
		: [];
};

onMounted(fetchResults);
</script>

<template>
	<div>
		<section class="max-w-3xl mx-auto p-6 text-white">
			<h1 class="text-2xl font-bold mb-6">Voting Results</h1>

			<div v-if="proposals.length">
				<UCollapsible
					v-for="proposal in proposals"
					:key="proposal.id"
					class="flex flex-col mb-4 gap-2 p-0 rounded shadow bg-neutral-800"
				>
					<UButton
						class="group p-4"
						color="neutral"
						variant="soft"
						trailing-icon="i-lucide-chevron-down"
						:ui="{
							trailingIcon:
								'group-data-[state=open]:rotate-180 transition-transform duration-200',
						}"
						block
					>
						<div class="w-full">
							<div
								class="flex justify-between items-center mb-2 w-full"
							>
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
											proposals &&
											proposals[0] &&
											proposals[0].score &&
											proposal.score
												? (proposal.score /
														proposals[0].score) *
														100 +
												  '%'
												: '0%',
									}"
								/>
							</div>
						</div>
					</UButton>

					<template #content>
						<div class="-mt-4 ml-4">
							<div ref="container">
								<span
                                    v-if="proposal.description"
									ref="text"
									class="prose dark:prose-inverted markdown-body ql-editor pt-0 text-sm text-gray-400 border-neutral-700"
									:v-html="
										DOMPurify.sanitize(proposal.description)
									"
								/>
							</div>
						</div>
					</template>
				</UCollapsible>
			</div>

			<div v-else class="text-gray-400">No votes have been cast yet.</div>
		</section>

		<section class="max-w-3xl mx-auto p-6 text-white">
			<div class="flex justify-end items-center gap-2">
				<div class="w-1/3">
					<UButton
						block
						label="Back"
						color="neutral"
						variant="outline"
						icon="i-lucide-chevron-left"
						@click="navigateTo(`/vontests/${vontestId}`)"
					/>
				</div>
			</div>
		</section>
	</div>
</template>
