<script setup lang="ts">
import { ref, computed } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import type { Database } from "~/types/supabase";
import DOMPurify from "dompurify";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

const props = withDefaults(
	defineProps<{
		proposals: Proposal[];
		form: { votes: Ref<{ proposalId: string; value: number }[]> };
		minimumChoices: number;
		maximumChoices: number;
	}>(),
	{
		minimumChoices: 0,
		maximumChoices: -1,
	}
);

const localMinChoices =
	props.minimumChoices === -1 ? props.proposals.length : props.minimumChoices;
const localMaxChoices =
	props.maximumChoices === -1 ? props.proposals.length : props.maximumChoices;

const unRankedProposals = ref<Proposal[]>([...props.proposals]);

const emit = defineEmits<{
	(e: "submit"): void;
}>();

// === State ===
const votesMap = ref<Record<string, number>>({});

const ranking = ref<Proposal[]>([]);
const loading = ref(false);

const user = useSupabaseUser();

// === Computed ===
const remainingToAdd = computed(() => localMinChoices - ranking.value.length);

const isJustRank = computed(() => {
	return localMinChoices >= props.proposals.length;
});

// === Methods ===
const addToRanking = (proposal: Proposal) => {
	if (ranking.value.length >= localMaxChoices) {
		alert("You have reached the maximum number of choices.");
	}
	if (!ranking.value.find((p) => p.id === proposal.id)) {
		ranking.value.push(proposal);

		unRankedProposals.value = unRankedProposals.value.filter(
			(p) => p.id !== proposal.id
		);
	}
};

const removeFromRanking = (proposalId: string) => {
	unRankedProposals.value.push(
		ranking.value.find((p) => p.id === proposalId)!!
	);
	ranking.value = ranking.value.filter((p) => p.id !== proposalId);
};

watch(
	() => props.proposals,
	(newProposals) => {
		if (newProposals.length === 0) return;

		if (isJustRank.value) {
			ranking.value = [...newProposals];
		}

		unRankedProposals.value = [...newProposals];
	},
	{ immediate: true }
);

const submitVotes = async () => {
	if (ranking.value.length < localMinChoices) {
		alert(
			"Please select at least the minimum number of choices before submitting. (" +
				localMinChoices +
				")"
		);
		return;
	} else if (ranking.value.length > localMaxChoices) {
		alert(
			"Please select at most the maximum number of choices before submitting. (" +
				localMaxChoices +
				")"
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
		<!-- CASE 1: minimumChoices <= proposals.length -->
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
				:disabled="loading || ranking.length === 0"
				:loading="loading"
				trailing-icon="i-lucide-check-circle"
				class="mt-4 font-bold"
				@click="submitVotes"
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
				v-for="proposal in unRankedProposals"
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
					loading ||
					ranking.length < localMinChoices ||
					ranking.length > localMaxChoices
				"
				:loading="loading"
				trailing-icon="i-lucide-check-circle"
				class="mt-4 font-bold"
				@click="submitVotes"
			>
				Submit Ranking
			</UButton>
		</div>
	</div>
</template>
