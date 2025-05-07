<script lang="ts" setup>
import type { Database } from "~/types/supabase";

type VontestInsert = Database["public"]["Tables"]["vontests"]["Insert"];

const supabase = useSupabaseClient<Database>();


const props = defineProps({
	fetchVontests: Function,
	loading: Boolean,
});

const form = reactive({
	title: "",
	description: "",
});

const createVontest = async () => {
	const newVontest: VontestInsert = {
		title: form.title,
		description: form.description,
	};

	const { data, error } = await supabase
		.from("vontests")
		.insert(newVontest)
		.select();
	if (error) {
		alert(error.message);
	} else {
		form.title = "";
		form.description = "";
		if (props.fetchVontests) await props.fetchVontests();
	}
};
</script>
<template>
	<UCard class="bg-neutral-800 mb-6">
		<template #header>
			<div class="text-xl font-bold">Start a New Vontest</div>
		</template>

		<form @submit.prevent="createVontest" class="space-y-4">
			<div>
				<label for="title" class="block text-sm mb-1">Question</label>
				<UInput
					id="title"
					v-model="form.title"
					placeholder="What’s the best way to reduce urban noise?"
					required
					class="w-full"
				/>
			</div>
			<div>
				<label for="description" class="block text-sm mb-1"
					>Context (optional)</label
				>
				<UTextarea
					id="description"
					v-model="form.description"
					:rows="3"
					class="w-full"
				/>
			</div>
			<UButton type="submit" :loading="loading" class="font-bold">
				Create
				<UIcon name="i-lucide-arrow-right" class="ml-2" />
			</UButton>
		</form>
	</UCard>
</template>
