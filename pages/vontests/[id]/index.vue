<script setup lang="ts">
import OptionsDropdown from "~/components/ui/OptionsDropdown.vue";
import type { Database } from "~/types/supabase";

type Vontest = Database["public"]["Tables"]["vontests"]["Row"];

const route = useRoute();
const supabase = useSupabaseClient<Database>();

const user = useSupabaseUser();

const vontestId = route.params.id as string;

const vontest = ref<Vontest | null>(null);

const { proposals, fetchProposals, submitProposal } =
	useProposals(vontestId);

const { fetchVontest } = useVontests();

onMounted(async () => {
	vontest.value = (await fetchVontest(vontestId)) || null;
	await fetchProposals();
});
</script>

<template>
	<section class="max-w-4xl mx-auto px-4 py-8 text-white">
		<h2 class="text-2xl font-semibold mb-4">The Question:</h2>

		<UCard v-if="vontest">
			<template #header>
				<h1 class="text-2xl font-bold">{{ vontest.title }}</h1>
				<OptionsDropdown
					v-if="vontest.created_by === user?.id"
					@edit="navigateTo(`/vontests/${vontestId}/edit`)"
					@delete="navigateTo(`/vontests/${vontestId}/delete`)"
				/>
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

		<!-- Proposal List -->
		<div>
			<div v-if="proposals.length">
				<h2 class="text-2xl font-semibold my-4">Proposals</h2>
				<UCard
					v-for="proposal in proposals"
					:key="proposal.id"
					class="group bg-neutral-800 mb-4 hover:bg-neutral-700 [&>*]:group-hover:border-neutral-700 [&>*]:transition transition"
				>
					<template #header>
						<div class="text-lg font-bold">
							{{ proposal.title }}
						</div>
					</template>
					<p
						class="text-gray-400 markdown-body ql-editor"
						v-html="proposal.description"
					></p>

					<template #footer>
						<div class="flex justify-between items-center gap-2">
							<small class="text-gray-500"
								>Submitted on
								{{
									new Date(
										proposal.created_at ?? ""
									).toLocaleString()
								}}</small
							>

							<NuxtLink
								:to="`/vontests/${vontest?.id}/vote`"
								class="w-1/3"
							>
								<UButton
									block
									variant="outline"
									icon="i-lucide-vote"
								>
									Vote
								</UButton>
							</NuxtLink>
						</div>
					</template>
				</UCard>
			</div>
			<div v-else class="text-gray-500 text-center p-4">
				No proposals yet. Be the first to suggest something.
			</div>
		</div>
	</section>
</template>
