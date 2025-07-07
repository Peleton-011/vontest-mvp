<script lang="ts" setup>
import type { Database } from "~/types/supabase";
import DOMPurify from "dompurify";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

const props = defineProps<{
	form: { votes: Ref<{ proposalId: string; value: number }[]> };
	proposals: Proposal[];
}>();

const emit = defineEmits<{
	(e: "submit"): void;
}>();

// votesMap for easier UI binding
const votesMap = ref<Record<string, number>>({});
const loading = ref(false);

const user = useSupabaseUser();

const handleUpVote = (id: string) => {
	const currentVotes = votesMap.value[id];

	if (currentVotes === 1) votesMap.value[id] = 0;
	else votesMap.value[id] = 1;
};

const handleDownVote = (id: string) => {
	const currentVotes = votesMap.value[id];

	if (currentVotes === -1) votesMap.value[id] = 0;
	else votesMap.value[id] = -1;
};

const submitVotes = async () => {
	if (!user.value) {
		alert("You must be logged in to submit votes.");
		return;
	}

	loading.value = true;

	// Update form.votes values before submitting

	for (const [proposal, value] of Object.entries(votesMap.value)) {
		if (value === 0) {
			continue;
		}

		props.form.votes.value.push({
			proposalId: proposal,
			value: value,
		});
	}

	emit("submit");

	loading.value = false;
};

onMounted(() => {
	props.proposals.forEach((proposal) => {
		votesMap.value[proposal.id] = 0;
	});
});
</script>

<template>
	<div>
		<UCard
			v-for="proposal in proposals"
			:key="proposal.id"
			class="mb-4 bg-neutral-800"
		>
			<template #header>
				<div class="text-lg font-semibold">{{ proposal.title }}</div>
			</template>

			<p
				class="text-sm text-gray-400"
				v-html="DOMPurify.sanitize(proposal.description!)"
			/>

			<template #footer>
				<div>
					<UButton
						:variant="
							votesMap[proposal.id] === 1 ? 'solid' : 'ghost'
						"
						icon="i-lucide-chevrons-up"
						@click="handleUpVote(proposal.id)"
					/>
					<UButton
						:variant="
							votesMap[proposal.id] === -1 ? 'solid' : 'ghost'
						"
						icon="i-lucide-chevrons-down"
						@click="handleDownVote(proposal.id)"
					/>
				</div>
			</template>
		</UCard>

		<UButton
			:disabled="loading"
			:loading="loading"
			trailing-icon="i-lucide-check-circle"
			class="font-bold"
			@click="submitVotes"
		>
			Submit Votes
		</UButton>
	</div>
</template>
