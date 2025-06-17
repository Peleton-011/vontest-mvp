<script lang="ts" setup>
import { useRoute, useRouter } from "vue-router";
import type { Database } from "~/types/supabase";
import OptionsDropdown from "~/components/ui/OptionsDropdown.vue";
import DOMPurify from "dompurify";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

const route = useRoute();
const router = useRouter();
const user = useSupabaseUser();

const proposalId = route.params.id as string;
const vontestId = route.params.vontestId as string;

const { fetchProposal } = useProposals(vontestId);
const { fetchThread, thread /*, loading, error*/ } = useThread();
const proposal = ref<Proposal | null>(null);

onMounted(async () => {
	try {
		const fetched = await fetchProposal(proposalId);
		proposal.value = fetched || null;
	} catch (e) {
		console.error("Error fetching proposal:", e);
	}

	fetchThread(proposalId, "proposal");
});

// Navigation helper
const navigateTo = (path: string) => router.push(path);
</script>

<template>
	<section
		v-if="proposal"
		class="max-w-4xl mx-auto px-4 py-8 text-white space-y-6"
	>
		<UCard v-if="proposal">
			<template #header>
				<div class="flex items-center justify-between">
					<h1 class="text-2xl font-bold">{{ proposal.title }}</h1>
					<OptionsDropdown
						v-if="proposal.created_by === user?.id"
						@edit="navigateTo(`/proposals/\${proposalId}/edit`)"
						@delete="navigateTo(`/proposals/\${proposalId}/delete`)"
					/>
				</div>
			</template>
			<p
				v-if="proposal.description"
				class="text-gray-400 markdown-body ql-editor"
				:v-html="DOMPurify.sanitize(proposal.description)"
			/>
			<template #footer>
				<div class="flex justify-between items-center gap-2">
					<small class="text-gray-500">
						Created on
						{{
							new Date(proposal.created_at ?? "").toLocaleString()
						}}
					</small>
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
							block
							icon="i-lucide-vote"
							@click="
								navigateTo('/vontests/' + vontestId + '/vote')
							"
						/>
					</div>
				</div>
			</template>
		</UCard>

		<UiCommentSection v-if="thread" :thread-id="thread?.id" />
	</section>
</template>
