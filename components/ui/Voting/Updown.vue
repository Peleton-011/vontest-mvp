<script lang="ts" setup>
import type { Database } from "~/types/supabase";
import DOMPurify from "dompurify";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

const props = defineProps<{
	proposals: Proposal[];
	votesMap: Record<string, number>;
	loading: boolean;
}>();

const emit = defineEmits<{
	(e: "submit-votes"): void;
}>();

const handleUpVote = (id: string) => {
	const currentVotes = props.votesMap[id];

	if (currentVotes === 1) props.votesMap[id] = 0;
	else props.votesMap[id] = 1;
};

const handleDownVote = (id: string) => {
	const currentVotes = props.votesMap[id];

	if (currentVotes === -1) props.votesMap[id] = 0;
	else props.votesMap[id] = -1;
};
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
						variant="ghost"
						icon="i-lucide-chevrons-up"
						@click="handleUpVote(proposal.id)"
					/>
					<UButton
						variant="ghost"
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
			@click="emit('submit-votes')"
		>
			Submit Votes
		</UButton>
	</div>
</template>
