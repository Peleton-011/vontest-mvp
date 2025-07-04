<script setup lang="ts">
import { ref, computed } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import type { Database } from "~/types/supabase";
import DOMPurify from "dompurify";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

const props = withDefaults(
	defineProps<{
		proposals: Proposal[];
		minimumChoices: number;
		maximumChoices: number;
		loading: boolean;
	}>(),
	{
		minimumChoices: -1,
		maximumChoices: -1,
	}
);

const localMinChoices = props.minimumChoices === -1 ? props.proposals.length : props.minimumChoices;
const localMaxChoices = props.maximumChoices === -1 ? props.proposals.length : props.maximumChoices;

const localProposals = ref<Proposal[]>([...props.proposals]);

const emit = defineEmits<{
	(e: "submit-ranking", ranking: Proposal[]): void;
}>();

// === State ===
const ranking = ref<Proposal[]>([]);

// === Computed ===
const remainingToAdd = computed(
	() => localMinChoices - ranking.value.length
);

const isJustRank = computed(() => {
	return (
		localMinChoices >= props.proposals.length 
	);
});

// === Methods ===
const addToRanking = (proposal: Proposal) => {
	if (ranking.value.length >= localMaxChoices) {
		alert("You have reached the maximum number of choices.");
	}
	if (!ranking.value.find((p) => p.id === proposal.id)) {
		ranking.value.push(proposal);

		localProposals.value = localProposals.value.filter(
			(p) => p.id !== proposal.id
		);
	}
};

const removeFromRanking = (proposalId: string) => {
	localProposals.value.push(ranking.value.find((p) => p.id === proposalId)!!);
	ranking.value = ranking.value.filter((p) => p.id !== proposalId);
};

watch(
	() => props.proposals,
	(newProposals) => {
		if (newProposals.length === 0) return;

		if (isJustRank.value) {
			ranking.value = [...newProposals];
		}

		localProposals.value = [...newProposals];
	},
	{ immediate: true }
);
</script>

<template>
	<div>
		<!-- CASE 1: minimumChoices <= proposals.length -->
		{{ isJustRank }}
		<div v-if="isJustRank">
			<p class="mb-2 text-gray-300">
				Rank the proposals in your preferred order:
			</p>

			<ClientOnly>
				<ol>
					<VueDraggable
						v-model="ranking"
						:animation="200"
						class="space-y-2"
					>
						<li
							v-for="(element, index) in ranking"
							:key="element.id"
							class="list-decimal marker:font-bold"
						>
							<UCard class="bg-neutral-800 ml-4">
								<template #header>
									<div
										class="flex justify-between items-center"
									>
										<span class="font-semibold">
											<!-- {{ index + 1 }}.  -->
											{{ element.title }}
										</span>
									</div>
								</template>

								<p
									class="text-sm text-gray-400"
									v-html="
										DOMPurify.sanitize(element.description!)
									"
								/>
							</UCard>
						</li>
					</VueDraggable>
				</ol>
			</ClientOnly>

			<UButton
				:disabled="props.loading || ranking.length === 0"
				:loading="props.loading"
				trailing-icon="i-lucide-check-circle"
				class="mt-4 font-bold"
				@click="emit('submit-ranking', ranking)"
			>
				Submit Ranking
			</UButton>
		</div>

		<!-- CASE 2: minimumChoices > proposals.length -->
		<div v-else>
			<div v-if="ranking.length > 0" class="mt-4">
				<p class="mb-2 text-gray-300">Your Ranking:</p>

				<ClientOnly>
					<ol>
						<VueDraggable
							v-model="ranking"
							:animation="200"
							class="space-y-2"
						>
							<li
								v-for="(element, index) in ranking"
								:key="element.id"
								class="list-decimal marker:font-bold"
							>
								<UCard class="bg-neutral-800 ml-4">
									<template #header>
										<div
											class="flex justify-between items-center"
										>
											<span class="font-semibold">
												<!-- {{ index + 1 }}. -->
												{{ element.title }}</span
											>
											<UButton
												size="xs"
												variant="ghost"
												icon="i-lucide-x"
												@click="
													removeFromRanking(
														element.id
													)
												"
											/>
										</div>
									</template>

									<p
										class="text-sm text-gray-400"
										v-html="
											DOMPurify.sanitize(
												element.description!
											)
										"
									/>
								</UCard>
							</li>
						</VueDraggable>
					</ol>
				</ClientOnly>
			</div>
			<p class="mb-2 text-gray-300">
				Select at least {{ localMinChoices }} proposals to rank ({{
					remainingToAdd
				}}
				remaining):
			</p>

			<div
				v-for="proposal in localProposals"
				:key="proposal.id"
				class="mb-4"
			>
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
								!!ranking.find(
									(p: Proposal) => p.id === proposal.id
								)
							"
							@click="addToRanking(proposal)"
						>
							Add to Ranking
						</UButton>
					</template>
				</UCard>
			</div>

			<UButton
				:disabled="
					props.loading || ranking.length < localMinChoices || ranking.length > localMaxChoices
				"
				:loading="props.loading"
				trailing-icon="i-lucide-check-circle"
				class="mt-4 font-bold"
				@click="emit('submit-ranking', ranking)"
			>
				Submit Ranking
			</UButton>
		</div>
	</div>
</template>
