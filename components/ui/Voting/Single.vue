<script setup lang="ts">
import { ref, computed } from "vue";
import type { Database } from "~/types/supabase";
import DOMPurify from "dompurify";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

const props = defineProps<{
	proposals: Proposal[];
	loading: boolean;
}>();

const localProposals = ref<Proposal[]>([...props.proposals]);

const emit = defineEmits<{
	(e: "submit-choice", ranking: Proposal): void;
}>();

// === State ===
const choice = ref<Proposal>();

// === Methods ===
const addChoice = (proposal: Proposal) => {
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
</script>

<template>
	<div>
		<div v-if="choice" class="mt-4">
			<p class="mb-2 text-gray-300">Your Choices:</p>

				<ol>
					<li class="list-decimal marker:font-bold">
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
					</li>
				</ol>
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
						:disabled="(choice && choice.id === proposal.id) || props.loading"
						@click="addChoice(proposal)"
					>
						Vote
					</UButton>
				</template>
			</UCard>
		</div>

		<UButton
			:disabled="props.loading"
			:loading="props.loading"
			trailing-icon="i-lucide-check-circle"
			class="mt-4 font-bold"
			@click="emit('submit-choice', choice!)"
		>
			Submit Vote
		</UButton>
	</div>
</template>
