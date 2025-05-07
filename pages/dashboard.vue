<script setup lang="ts">
import type { Database } from "~/types/supabase";

type Vontest = Database["public"]["Tables"]["vontests"]["Row"];

const supabase = useSupabaseClient<Database>();
const user = useSupabaseUser();

const { vontests, refresh, loading, error } = useFetchVontests();

const searchQuery = ref("");
const currentPage = ref(1);
const pageSize = 6;

const filteredVontests = computed(() => {
	return vontests.value.filter((v) => {
		return (
			v.title?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
			v.description
				?.toLowerCase()
				.includes(searchQuery.value.toLowerCase())
		);
	});
});

const paginatedVontests = computed(() => {
	const start = (currentPage.value - 1) * pageSize;
	const end = start + pageSize;
	return filteredVontests.value.slice(start, end);
});

const totalPages = computed(() =>
	Math.ceil(filteredVontests.value.length / pageSize)
);
</script>

<template>
	<section class="p-6 max-w-4xl mx-auto text-white">
		<FormVontest :fetch="refresh" :loading="loading" />

		<div v-if="vontests.length > 0" class="space-y-4">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-2xl font-semibold mb-2">Browse Vontests</h2>

				<!-- Search Bar -->
				<div class="mb-6 flex items-center justify-between">
					<UInput
						v-model="searchQuery"
						placeholder="Search Vontests..."
						icon="i-lucide-search"
						class="w-full max-w-md"
					/>
				</div>
			</div>

			<!-- Vontest Cards -->
			<NuxtLink
				v-for="vontest in paginatedVontests"
				:key="vontest.id"
				:to="`/vontests/${vontest.id}`"
				class="block"
			>
				<UCard
					class="group bg-neutral-800 text-white hover:bg-neutral-700 [&>*]:group-hover:border-neutral-700 [&>*]:transition transition vontest-card"
				>
					<template #header>
						<div class="text-lg font-bold">{{ vontest.title }}</div>
					</template>
					<p class="text-sm text-gray-400 border-neutral-700">
						{{ vontest.description }}
					</p>
					<template #footer>
						<div class="flex justify-between items-center gap-2">
							<small class="text-gray-500 border-neutral-700"
								>Created
								{{
									new Date(
										vontest.created_at ?? ""
									).toLocaleString()
								}}</small
							>

							<div class="flex gap-2">
								<NuxtLink
									:to="`/vontests/${vontest.id}/vote`"
									class="w-1/2"
								>
									<UButton
										block
										variant="outline"
										icon="i-lucide-vote"
									>
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
							</div>
						</div>
					</template>
				</UCard>
			</NuxtLink>

			<!-- Pagination Controls -->
			<div
				v-if="totalPages > 1"
				class="mt-8 flex justify-center items-center space-x-2 text-sm"
			>
				<UButton
					size="sm"
					icon="i-lucide-chevron-left"
					:disabled="currentPage === 1"
					@click="currentPage--"
				/>
				<span class="text-gray-400"
					>Page {{ currentPage }} of {{ totalPages }}</span
				>
				<UButton
					size="sm"
					icon="i-lucide-chevron-right"
					:disabled="currentPage === totalPages"
					@click="currentPage++"
				/>
			</div>
		</div>
		<div v-else class="text-gray-500 text-center">
			No Vontests yet. Be the first to create one!
		</div>
	</section>
</template>
