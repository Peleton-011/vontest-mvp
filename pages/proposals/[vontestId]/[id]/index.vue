<script setup lang="ts">
import OptionsDropdown from "~/components/ui/OptionsDropdown.vue";
import type { Database } from "~/types/supabase";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

const route = useRoute();
const supabase = useSupabaseClient<Database>();

const user = useSupabaseUser();

const id = route.params.id as string;
const vontestId = route.params.vontestId as string;

const { fetchProposal } = useProposals(vontestId);

const proposal = ref<Proposal | null>((await fetchProposal(id)) || null);
</script>

<template>
	<section class="max-w-4xl mx-auto px-4 py-8 text-white">
		<h2 class="text-2xl font-semibold mb-4">The Proposal:</h2>

		<UCard v-if="proposal">
			<template #header>
				<div class="flex items-center justify-between">
					<h1 class="text-2xl font-bold">{{ proposal.title }}</h1>
					<OptionsDropdown
						v-if="proposal.created_by === user?.id"
						@edit="navigateTo(`/proposals/${id}/edit`)"
						@delete="navigateTo(`/proposals/${id}/delete`)"
					/>
				</div>
			</template>
			<p
				class="text-gray-400 markdown-body ql-editor"
				v-html="proposal.description"
			></p>
			<template #footer>
				<div class="flex justify-between items-center gap-2">
					<small class="text-gray-500"
						>Created on
						{{
							new Date(proposal.created_at ?? "").toLocaleString()
						}}</small
					>
					<div class="w-1/3 flex gap-2">
						<UButton
							label="Respond"
							variant="subtle"
							:disabled="true"
							block
                            icon="i-lucide-message-circle"
						/>
						<UButton
							label="Vote"
							variant="subtle"
							@click="navigateTo('/vontests/' + vontestId + '/vote')"
							block
                            icon="i-lucide-vote"
						/>
					</div>
				</div>
			</template>
		</UCard>
	</section>
</template>
