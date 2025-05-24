<script setup lang="ts">
import OptionsDropdown from "~/components/ui/OptionsDropdown.vue";
import StaticCard from "~/components/ui/StaticCard.vue";
import type { Database } from "~/types/supabase";

type Vontest = Database["public"]["Tables"]["vontests"]["Row"];
type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

const route = useRoute();
const supabase = useSupabaseClient<Database>();

const user = useSupabaseUser();

const vontestId = route.params.id as string;

const { proposals, submitProposal, fetchProposals } = useProposals(vontestId);

const { fetchVontest } = useVontests();

const vontest = ref<Vontest | null>((await fetchVontest(vontestId)) || null);

const pageSize = 6;

const {
	searchQuery,
	currentPage,
	totalPages,
	paginatedItems: paginatedProposals,
	goToNextPage,
	goToPrevPage,
} = usePaginationSearch<Proposal>(proposals, pageSize);

onMounted(() => {
	fetchProposals();
});

watch(proposals, () => {
	console.log(proposals.value);
});
watch(paginatedProposals, () => {
	console.log(paginatedProposals.value);
	console.log(paginatedProposals.value.length);
});
</script>

<template>
	<section class="max-w-4xl mx-auto px-4 py-8 text-white">
		<h2 class="text-2xl font-semibold mb-4">The Question:</h2>

		<UCard v-if="vontest">
			<template #header>
				<div class="flex items-center justify-between">
					<h1 class="text-2xl font-bold">{{ vontest.title }}</h1>
					<OptionsDropdown
						v-if="vontest.created_by === user?.id"
						@edit="navigateTo(`/vontests/${vontestId}/edit`)"
						@delete="navigateTo(`/vontests/${vontestId}/delete`)"
					/>
				</div>
			</template>
			<p
				class="text-gray-400 markdown-body ql-editor"
				v-html="vontest.description"
			></p>
			<template #footer>
				<div class="flex justify-between items-center gap-2">
					<small class="text-gray-500"
						>Created on
						{{
							new Date(vontest.created_at ?? "").toLocaleString()
						}}</small
					>
					<div class="w-1/3">
						<FormSimpleProposal
							:vontest-id="vontestId"
							@submit="submitProposal"
						/>
					</div>
				</div>
			</template>
		</UCard>
	</section>
	<section class="p-6 max-w-4xl mx-auto text-white">
		<div v-if="proposals.length > 0" class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-2xl font-semibold">Browse Proposals</h2>

				<div class="flex justify-center items-center gap-2">
					<!-- Search Bar -->
					<div class="flex items-center justify-between">
						<UInput
							v-model="searchQuery"
							placeholder="Search Proposals..."
							icon="i-lucide-search"
							class="w-full max-w-md"
						/>
					</div>
					<!-- Add Proposal -->
					<UButton
						label="New Proposal"
						color="primary"
						variant="subtle"
						:to="'/proposals/' + vontestId + '/new'"
					/>
				</div>
			</div>

			<!-- Proposal Cards -->

			<StaticCard
				v-for="proposal in paginatedProposals"
				:key="proposal.id"
				:to="`/proposals/${vontestId}/${proposal.id}`"
				:title="proposal.title || ''"
				:description="proposal.description || ''"
				:created="proposal.created_at || ''"
			>
			</StaticCard>

			<!-- Pagination Controls -->
			<div
				v-if="totalPages > 1"
				class="mt-8 flex justify-center items-center space-x-2 text-sm"
			>
				<UButton
					size="sm"
					icon="i-lucide-chevron-left"
					:disabled="currentPage === 1"
					:variant="currentPage === 1 ? 'soft' : 'solid'"
					@click="goToPrevPage"
				/>
				<span class="text-gray-400"
					>Page {{ currentPage }} of {{ totalPages }}</span
				>
				<UButton
					size="sm"
					icon="i-lucide-chevron-right"
					:disabled="currentPage === totalPages"
					:variant="currentPage === totalPages ? 'soft' : 'solid'"
					@click="goToNextPage"
				/>
			</div>
		</div>
		<div v-else class="text-gray-500 text-center p-4">
			No proposals yet. Be the first to suggest something.
		</div>
	</section>
</template>
