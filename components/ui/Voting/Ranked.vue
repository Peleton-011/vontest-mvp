<script setup lang="ts">
import { ref, computed } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import type { Database } from "~/types/supabase";
import DOMPurify from "dompurify";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

const props = defineProps<{
	proposals: Proposal[];
	minimumChoices: number;
	loading: boolean;
}>();

const emit = defineEmits<{
	(e: "submit-ranking", ranking: Proposal[]): void;
}>();

// === State ===
const ranking = ref<Proposal[]>([]);

// === Computed ===
const remainingToAdd = computed(
	() => props.minimumChoices - ranking.value.length
);

// === Methods ===
const addToRanking = (proposal: Proposal) => {
	if (!ranking.value.find((p) => p.id === proposal.id)) {
		ranking.value.push(proposal);
	}
};

const removeFromRanking = (proposalId: string) => {
	ranking.value = ranking.value.filter((p) => p.id !== proposalId);
};

onMounted(() => {
	if (props.minimumChoices <= props.proposals.length) {
		ranking.value = [...props.proposals];
	}
});
</script>

<template>
	<div>
		<!-- CASE 1: minimumChoices <= proposals.length -->
		<div v-if="props.minimumChoices <= props.proposals.length">
			<p class="mb-2 text-gray-300">
				Rank the proposals in your preferred order:
			</p>

			<ClientOnly>
				<VueDraggable
					v-model="ranking"
					:animation="200"
					class="space-y-2"
				>
					<ol>
                        
						<li
							v-for="(element, index) in ranking"
							:key="element.id"
                            class="list-decimal"
						>
							<UCard class="bg-neutral-800">
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
					</ol>
				</VueDraggable>
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
			<p class="mb-2 text-gray-300">
				Select at least {{ props.minimumChoices }} proposals to rank ({{
					remainingToAdd
				}}
				remaining):
			</p>

			<div
				v-for="proposal in props.proposals"
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

			<div v-if="ranking.length > 0" class="mt-4">
				<p class="mb-2 text-gray-300">Your Ranking:</p>

				<ClientOnly>
					<VueDraggable
						v-model="ranking"
						item-key="id"
						:animation="200"
						class="space-y-2"
					>
						<template #item="{ element, index }">
							<UCard class="bg-neutral-800">
								<template #header>
									<div
										class="flex justify-between items-center"
									>
										<span class="font-semibold"
											>{{ index + 1 }}.
											{{ element.title }}</span
										>
										<UButton
											size="xs"
											variant="ghost"
											icon="i-lucide-x"
											@click="
												removeFromRanking(element.id)
											"
										/>
									</div>
								</template>

								<p
									class="text-sm text-gray-400"
									v-html="
										DOMPurify.sanitize(element.description!)
									"
								/>
							</UCard>
						</template>
					</VueDraggable>
				</ClientOnly>
			</div>

			<UButton
				:disabled="
					props.loading || ranking.length < props.minimumChoices
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
