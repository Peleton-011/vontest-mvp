<script setup lang="ts">
import { ref, computed } from "vue";
import type { Database } from "~/types/supabase";
import DOMPurify from "dompurify";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

const props = defineProps<{
	proposals: Proposal[];
	form: { votes: Ref<{ proposalId: string; value: number }[]> };
}>();

const localProposals = ref<Proposal[]>([...props.proposals]);

const emit = defineEmits<{
	(e: "submit"): void;
}>();

// votesMap for easier UI binding
const votesMap = ref<Record<string, number>>({});
const loading = ref(false);

const user = useSupabaseUser();
const choice = ref<Proposal>();

// === Methods ===
const addChoice = (proposal: Proposal) => {
	if (choice.value) removeChoice();

	choice.value = proposal;

	localProposals.value = localProposals.value.filter(
		(p) => p.id !== proposal.id
	);
};

const removeChoice = () => {
	localProposals.value.push(choice.value!);
	choice.value = undefined;
};

watch(
	() => props.proposals,
	(newProposals) => {
		if (newProposals.length === 0) return;

		localProposals.value = [...newProposals];
	},
	{ immediate: true }
);

const submitVotes = async () => {
	if (!choice.value) {
		alert(
			"Please select a proposal before submitting your vote."
		);
		return;
	} 

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
		<div v-if="choice" class="my-4">
			<p class="mb-2 text-gray-300">Your Choice:</p>

			<UCard class="bg-neutral-800 ml-4">
				<template #header>
					<div class="flex justify-between items-center">
						<span class="font-semibold">
							<!-- {{ index + 1 }}. -->
							{{ choice.title }}</span
						>
						<UButton
							size="xs"
							variant="ghost"
							icon="i-lucide-x"
							@click="removeChoice()"
						/>
					</div>
				</template>

				<p
					class="text-sm text-gray-400"
					v-html="DOMPurify.sanitize(choice.description!)"
				/>
			</UCard>
		</div>

		<div v-for="proposal in localProposals" :key="proposal.id" class="mb-4">
			<UCard class="bg-neutral-800">
				<template #header>
					<div class="text-lg font-semibold">
						{{ proposal.title }}
					</div>
				</template>

				<p
					class="text-sm text-gray-400"
					v-html="DOMPurify.sanitize(proposal.description!)"
				/>

				<template #footer>
					<UButton
						size="sm"
						:disabled="
							(choice && choice.id === proposal.id) ||
							loading
						"
						@click="addChoice(proposal)"
					>
						Vote
					</UButton>
				</template>
			</UCard>
		</div>

		<UButton
			:disabled="loading"
			:loading="loading"
			trailing-icon="i-lucide-check-circle"
			class="mt-4 font-bold"
			@click="emit('submit')"
		>
			Submit Vote
		</UButton>
	</div>
</template>
