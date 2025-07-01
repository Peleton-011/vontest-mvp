<script setup lang="ts">
import { useVoting } from "~/composables/useVoting";
import DOMPurify from "dompurify";
import type { Database } from "~/types/supabase";

type Result = {
    score: number;
    id: string;
    title: string;
    description: string | null;    
}

const route = useRoute();
const { fetchProposalResults } = useVoting();

const vontestId = route.params.id as string;
const results = ref<Result[]>([]);

const fetchResults = async () => {
	const proposalResults = await fetchProposalResults(vontestId);
	results.value = proposalResults;
};

onMounted(fetchResults);

const navigateTo = useRouter().push;
</script>

<template>
	<div>
		<section class="max-w-3xl mx-auto p-6 text-white">
			<h1 class="text-2xl font-bold mb-6">Voting Results</h1>

			<div v-if="results.length">
				<UCollapsible
					v-for="proposal in results"
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
										width: results[0]?.score
											? (proposal.score /
													results[0].score) *
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
							<div>
								<span
									v-if="proposal.description"
									class="prose dark:prose-inverted markdown-body ql-editor pt-0 text-sm text-gray-400 border-neutral-700"
									v-html="
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
