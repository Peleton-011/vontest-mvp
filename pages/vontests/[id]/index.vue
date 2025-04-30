<script setup lang="ts">
import type { Database } from "~/types/supabase";

type Vontest = Database["public"]["Tables"]["vontests"]["Row"];
type Proposal = Database["public"]["Tables"]["proposals"]["Row"];
type ProposalInsert = Database["public"]["Tables"]["proposals"]["Insert"];

const route = useRoute();
const supabase = useSupabaseClient<Database>();
const user = useSupabaseUser();

const vontestId = route.params.id as string;
const vontest = ref<Vontest | null>(null);
const proposals = ref<Proposal[]>([]);
const loading = ref(false);

const proposalForm = reactive({
	title: "",
	description: "",
});

const fetchVontest = async () => {
	const { data, error } = await supabase
		.from("vontests")
		.select("*")
		.eq("id", vontestId)
		.single();
	if (!error) vontest.value = data;
};

const fetchProposals = async () => {
	const { data, error } = await supabase
		.from("proposals")
		.select("*")
		.eq("vontest_id", vontestId)
		.order("created_at", { ascending: false });
	if (!error) proposals.value = data;
};

const submitProposal = async () => {
	loading.value = true;
	const newProposal: ProposalInsert = {
		vontest_id: vontestId,
		title: proposalForm.title,
		description: proposalForm.description,
	};
	const { data, error } = await supabase
		.from("proposals")
		.insert(newProposal)
		.select();

	if (!error) {
		proposalForm.title = "";
		proposalForm.description = "";
		await fetchProposals();
	} else {
		alert(error.message);
	}
	loading.value = false;
};

onMounted(() => {
	fetchVontest();
	fetchProposals();
});
</script>

<template>
	<section class="max-w-4xl mx-auto px-4 py-8 text-white">
		<UCard v-if="vontest" class="bg-neutral-800 mb-8">
			<template #header>
				<h1 class="text-2xl font-bold">{{ vontest.title }}</h1>
			</template>
			<p class="text-gray-400">{{ vontest.description }}</p>
		</UCard>

		<!-- Add Proposal Form -->
		<UCard class="bg-neutral-800 mb-6">
			<template #header>
				<div class="text-lg font-semibold">Propose a Solution</div>
			</template>
			<form @submit.prevent="submitProposal" class="space-y-4">
				<div>
					<label
						class="block text-sm font-medium text-gray-300"
						for="title"
						>Title</label
					>
					<UInput
						id="title"
						v-model="proposalForm.title"
						required
						class="w-full mt-1"
					/>
				</div>
				<div>
					<label
						class="block text-sm font-medium text-gray-300"
						for="desc"
						>Description</label
					>
					<UTextarea
						id="desc"
						v-model="proposalForm.description"
						:rows="4"
						class="w-full mt-1"
					/>
				</div>
				<UButton
					type="submit"
					:loading="loading"
					class="font-bold"
					trailing-icon="i-lucide-send"
				>
					Submit Proposal
				</UButton>
			</form>
		</UCard>

		<!-- Proposal List -->
		<div v-if="proposals.length">
			<h2 class="text-xl font-semibold mb-4">Proposals</h2>
			<UCard
				v-for="proposal in proposals"
				:key="proposal.id"
				class="group bg-neutral-800 mb-4 hover:bg-neutral-700 [&>*]:group-hover:border-neutral-700 [&>*]:transition transition"
			>
				<template #header>
					<div class="text-lg font-bold">{{ proposal.title }}</div>
				</template>
				<p class="text-gray-400">{{ proposal.description }}</p>
				<template #footer>
					<small class="text-gray-500"
						>Submitted on
						{{
							new Date(proposal.created_at ?? "").toLocaleString()
						}}</small
					>
				</template>
			</UCard>
		</div>
		<div v-else class="text-gray-500 text-center">
			No proposals yet. Be the first to suggest something.
		</div>
	</section>
</template>
