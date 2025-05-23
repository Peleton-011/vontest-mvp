<script setup lang="ts">
import type { Database } from "~/types/supabase";

type Vontest = Database["public"]["Tables"]["vontests"]["Row"];

const props = defineProps<{
	vontestId?: string;
}>();

const vontest = ref<Vontest | null>(null);

const {
	form,
	createVontest,
	editVontest,
	updateVontest,
	fetchVontest,
	loading,
} = useVontests();

onMounted(async () => {
	if (!props.vontestId) return;
	vontest.value = (await fetchVontest(props.vontestId)) || null;

	vontest.value && editVontest(vontest.value);
});

const submit = async () => {
	if (props.vontestId) {
		//Handle submit of an update
		await updateVontest();
		navigateTo(`/vontests/${props.vontestId}`);
		return;
	}

	//Handle submit of a new vontest
	const newVontest = await createVontest();

	if (newVontest) {
		navigateTo(`/vontests/${newVontest?.id}`);
	}
};
</script>

<template>
	<div class="w-full flex flex-col items-center">
		<form
			@submit.prevent="submit"
			class="space-y-4 md:max-w-3/4 lg:max-w-1/2"
		>
			<h1 class="text-2xl font-bold my-4 w-full text-center">
				Submit a new Vontest
			</h1>

			<div>
				<label for="title" class="block mb-1 text-lg font-semibold">
					Question
				</label>

				<UInput
					id="title"
					v-model="form.title"
					placeholder="What’s the best way to reduce urban noise?"
					required
					class="w-full"
				/>
			</div>
			<div>
				<label
					for="description"
					class="block mb-1 text-lg font-semibold"
				>
					Context (optional)
				</label>
				<ClientOnly>
					<!-- class="w-full rounded-[calc(var(--ui-radius)*1.5)] border-0 placeholder:text-(--ui-text-dimmed) focus:outline-none disabled:cursor-not-allowed disabled:opacity-75 transition-colors px-2.5 py-1.5 text-sm gap-1.5 text-(--ui-text-highlighted) bg-(--ui-bg) ring ring-inset ring-(--ui-border-accented) focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[--ui-primary]" -->
					<MdEditor
						v-model="form.description"
						id="description"
					/>
				</ClientOnly>
			</div>
			<UButton type="submit" :loading="loading" class="font-bold" to="">
				Create <UIcon name="i-lucide-arrow-right" class="ml-2" />
			</UButton>
		</form>
	</div>
</template>
