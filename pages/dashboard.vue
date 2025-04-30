<script setup lang="ts">
import type { Database } from "~/types/supabase";

type VontestInsert = Database["public"]["Tables"]["vontests"]["Insert"];
type Vontest = Database["public"]["Tables"]["vontests"]["Row"];

const supabase = useSupabaseClient<Database>();
const user = useSupabaseUser();

const form = reactive({
	title: "",
	description: "",
});
const loading = ref(false);
const error = ref("");
const vontests = ref<Vontest[]>([]);

const fetchVontests = async () => {
	const { data, error } = await supabase
		.from("vontests")
		.select("*")
		.order("created_at", { ascending: false });

	if (error) {
		console.error(error);
	} else {
		vontests.value = data;
	}
};

const createVontest = async () => {
	loading.value = true;

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
		await fetchVontests();
	}
	loading.value = false;
};

onMounted(fetchVontests);
</script>

<template>
	<section class="p-6 max-w-4xl mx-auto text-white">
		<UCard class="bg-neutral-800 mb-6">
			<template #header>
				<div class="text-xl font-bold">Start a New Vontest</div>
			</template>

			<form @submit.prevent="createVontest" class="space-y-4">
				<div>
					<label for="title" class="block text-sm mb-1"
						>Question</label
					>
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

		<div v-if="vontests.length" class="space-y-4">
			<h2 class="text-2xl font-semibold mb-2">Recent Vontests</h2>
			<NuxtLink
				v-for="vontest in vontests"
				:key="vontest.id"
				:to="`/vontests/${vontest.id}`"
				class="block"
			>
				<UCard
					class="group bg-neutral-800 text-white hover:bg-neutral-700 [&>*]:group-hover:border-neutral-700 [&>*]:transition transition vontest-card"
				>
					<template #header>
						<div class="text-lg font-bold">{{ vontest.title }}</div>
					</template>
					<p class="text-sm text-gray-400 border-neutral-700">
						{{ vontest.description }}
					</p>
					<template #footer>
						<small class="text-gray-500 border-neutral-700"
							>Created
							{{
								new Date(
									vontest.created_at ?? ""
								).toLocaleString()
							}}</small
						>
					</template>
				</UCard>
			</NuxtLink>
		</div>
		<div v-else class="text-gray-500 text-center">
			No Vontests yet. Be the first to create one!
		</div>
	</section>
</template>
