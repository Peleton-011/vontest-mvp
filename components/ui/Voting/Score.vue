<script lang="ts" setup>
import type { Database } from "~/types/supabase";
import DOMPurify from "dompurify";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

const props = defineProps<{
	proposals: Proposal[];
	votesMap: Record<string, number>;
	totalPoints: number;
	remainingPoints: number;
	loading: boolean;
}>();

const emit = defineEmits<{
	(e: "submit-votes"): void;
}>();
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
				<label class="text-sm text-gray-300"
					>Points: {{ votesMap[proposal.id] }}</label
				>
				<input
					v-model="votesMap[proposal.id]"
					type="range"
					min="0"
					:max="totalPoints"
					class="w-full mt-2 accent-primary-500"
				/>
			</template>
		</UCard>

		<UButton
			:disabled="remainingPoints !== 0 || loading"
			:loading="loading"
			trailing-icon="i-lucide-check-circle"
			class="font-bold"
			@click="emit('submit-votes')"
		>
			Submit Votes
		</UButton>
	</div>
</template>
