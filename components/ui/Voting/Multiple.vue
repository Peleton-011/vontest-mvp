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

const unChosenProposals = ref<Proposal[]>([...props.proposals]);

const emit = defineEmits<{
	(e: "submit"): void;
}>();

const loading = ref(false);

const user = useSupabaseUser();
const choices = ref<Proposal[]>([]);

// === Computed ===
const remainingToAdd = computed(() => localMinChoices - choices.value.length);

// === Methods ===
const addToChoices = (proposal: Proposal) => {
	if (choices.value.length >= localMaxChoices) {
		alert(
			"You have reached the maximum number of choices. (" +
				localMaxChoices +
				")"
		);
	}
	if (!choices.value.find((p) => p.id === proposal.id)) {
		choices.value.push(proposal);

		unChosenProposals.value = unChosenProposals.value.filter(
			(p) => p.id !== proposal.id
		);
	}
};

const removeFromChoices = (proposalId: string) => {
	unChosenProposals.value.push(
		choices.value.find((p) => p.id === proposalId)!!
	);
	choices.value = choices.value.filter((p) => p.id !== proposalId);
};

watch(
	() => props.proposals,
	(newProposals) => {
		if (newProposals.length === 0) return;

		unChosenProposals.value = [...newProposals];
	},
	{ immediate: true }
);

const submitVotes = async () => {
	if (choices.value.length < localMinChoices) {
		alert(
			"Please select at least the minimum number of choices before submitting. (" +
				localMinChoices +
				")"
		);
		return;
	} else if (choices.value.length > localMaxChoices) {
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

	choices.value.forEach((choice) => {
		props.form.votes.value.push({
			proposalId: choice.id,
			value: 1,
		});
	});

	emit("submit");

	loading.value = false;
};
</script>

<template>
	<div>
		<div v-if="choices.length > 0" class="mt-4">
			<p class="mb-2 text-gray-300">Your Choices:</p>

			<ClientOnly>
				<ol>
					<VueDraggable
						v-model="choices"
						:animation="200"
						class="space-y-2"
					>
						<li
							v-for="(element, index) in choices"
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
												removeFromChoices(element.id)
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
						</li>
					</VueDraggable>
				</ol>
			</ClientOnly>
		</div>
		<p class="mb-2 text-gray-300">
			Select at least {{ localMinChoices }} proposals ({{
				remainingToAdd
			}}
			remaining):
		</p>

		<div
			v-for="proposal in unChosenProposals"
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
							!!choices.find(
								(p: Proposal) => p.id === proposal.id
							)
						"
						@click="addToChoices(proposal)"
					>
						Add to Choices
					</UButton>
				</template>
			</UCard>
		</div>

		<UButton
			:disabled="
				loading ||
				choices.length < localMinChoices ||
				choices.length > localMaxChoices
			"
			:loading="loading"
			trailing-icon="i-lucide-check-circle"
			class="mt-4 font-bold"
			@click="submitVotes"
		>
			Submit Choices
		</UButton>
	</div>
</template>
