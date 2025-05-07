<script lang="ts" setup>
import type { Database } from "~/types/supabase";

type VontestInsert = Database["public"]["Tables"]["vontests"]["Insert"];

const supabase = useSupabaseClient<Database>();

const open = ref(false);

const props = defineProps({
	fetchVontests: {type: Function, required: true},
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
        open.value = false;
		form.title = "";
		form.description = "";
		props.fetchVontests();
	}
};
</script>
<template>
	<UModal class="bg-neutral-800 mb-6" title="Start a New Vontest" v-model:open="open">
        <UButton label="New Vontest" color="primary" variant="subtle" />
		<!-- <template #header>
			<div class="text-xl font-bold">Start a New Vontest</div>
		</template> -->

        <template #body>

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
    </template>
	</UModal>
</template>
