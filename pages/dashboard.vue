<script setup lang="ts">
import StaticCard from "~/components/ui/StaticCard.vue";
import type { Database } from "~/types/supabase";

type Vontest = Database["public"]["Tables"]["vontests"]["Row"];

const { vontests, refresh, loading, error } = useVontests();

const pageSize = 6;

const {
	searchQuery,
	currentPage,
	totalPages,
	paginatedItems: paginatedVontests,
	goToNextPage,
	goToPrevPage,
} = usePaginationSearch<Vontest>(vontests, pageSize);
</script>

<template>
	<section class="p-6 max-w-4xl mx-auto text-white">
		<div v-if="vontests.length > 0" class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-2xl font-semibold">Browse Vontests</h2>

				<div class="flex justify-center items-center gap-2">
					<!-- Search Bar -->
					<div class="flex items-center justify-between">
						<UInput
							v-model="searchQuery"
							placeholder="Search Vontests..."
							icon="i-lucide-search"
							class="w-full max-w-md"
						/>
					</div>
					<!-- Add Vontest -->
					<UButton
						label="New Vontest"
						color="primary"
						variant="subtle"
						to="/vontests/new"
					/>
				</div>
			</div>

			<!-- Vontest Cards -->

			<StaticCard
				v-for="vontest in paginatedVontests"
				:key="vontest.id"
				:to="`/vontests/${vontest.id}`"
				:title="vontest.title || ''"
				:description="vontest.description || ''"
				:created="vontest.created_at || ''"
			>
				<template v-slot:actions>
					<NuxtLink
						:to="`/vontests/${vontest.id}/vote`"
						class="w-1/2"
					>
						<UButton block variant="outline" icon="i-lucide-vote">
							Vote
						</UButton>
					</NuxtLink>
					<NuxtLink
						:to="`/vontests/${vontest?.id}/results`"
						class="w-1/2"
					>
						<UButton
							block
							variant="outline"
							icon="i-lucide-chart-bar"
						>
							Results
						</UButton>
					</NuxtLink>
				</template>
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
		<div v-else class="text-gray-500 text-center">
			No Vontests yet. Be the first to create one!
		</div>
	</section>
</template>
