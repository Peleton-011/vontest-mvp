<script setup lang="ts">
import { ref } from "vue";
import type {
	RadioGroupItem,
	RadioGroupValue,
	StepperItem,
	SelectItem,
} from "@nuxt/ui";

const props = defineProps<{
	vontestId?: string;
}>();

const {
	form: vontestForm,
	createVontest,
	editVontest,
	updateVontest,
	fetchVontest,
	loading,
} = useVontests();

const {
	form: settingsForm,
	createVotingSetting,
	error: settingsError,
} = useVotingSettings();

const form = computed({
	get() {
		return {
			...vontestForm,

			...settingsForm,
		};
	},

	set(value) {
		Object.entries(value).forEach(([key, val]) => {
			if (key in vontestForm) {
				(vontestForm as { [key: string]: unknown })[key] = val;
			} else if (key in settingsForm) {
				(settingsForm as { [key: string]: unknown })[key] = val;
			}
		});
	},
});

const anonymityValue = computed({
	get() {
		return form.value.anonymous.value ? "private" : "public";
	},
	set(value) {
		form.value.anonymous.value = value === "private";
	},
});

// Fetch vontest if it's an update
onMounted(async () => {
	if (!props.vontestId) return;
	const vontest = (await fetchVontest(props.vontestId)) || null;

	if (vontest) editVontest(vontest);
});

const showAdvanced = ref(false);

const step = ref(0);

const stepper = useTemplateRef("stepper");
const stepperItems = ref<StepperItem[]>([
	{
		title: "Basic Info",
		// description: " Describe your Vontest",
		icon: "i-lucide-info",
		slot: "info" as const,
	},
	{
		title: "Proposal Settings",
		// description: " Configure the proposals",
		icon: "i-lucide-settings",
		slot: "proposal" as const,
	},
	{
		title: "Voting Method",
		// description: " Select your voting method",
		icon: "i-lucide-vote",
		slot: "voting" as const,
	},
	{
		title: "Review & Publish",
		// description: " Review and publish your Vontest",
		icon: "i-lucide-check",
		slot: "review" as const,
	},
]);

const permissionOptions = ref<RadioGroupItem[]>([
	{
		label: "Anyone",
		description: "Anyone can add proposals",
		value: "all",
	},
	{
		label: "Creator",
		description: "Only I can add proposals",
		value: "creator",
	},
]);

const anonymityOptions = ref<RadioGroupItem[]>([
	{
		label: "Public",
		description: "Show votes and voter names",
		value: "public",
	},
	{
		label: "Private",
		description: "Hide voter names",
		value: "private",
	},
]);

const votingMethods = ref<SelectItem[]>([
	{ label: "Single choice", value: "single" },
	{
		label: "Approval voting (multiple choice)",
		value: "multiple",
	},
	{ label: "Ranked choice", value: "ranked" },
	{ label: "Score voting", value: "score" },
	{ label: "Updown", value: "updown" },
	// { label: "Likert", value: "likert" },
	// { label: "Quadratic voting", value: "quadratic" },
]);

const options = ref<{ label: string }[]>([{ label: "" }]);

const addOption = () => {
	options.value.push({ label: "" });
};
const removeOption = (i: number) => {
	options.value.splice(i, 1);
};
const toggleAdvanced = () => {
	showAdvanced.value = !showAdvanced.value;
};

const publish = async () => {
	// console.log(form);
	// Placeholder: handle form submission
	// console.log("Publishing vontest", form);

	if (props.vontestId) {
		//Handle submit of an update
		await updateVontest();
		navigateTo(`/vontests/${props.vontestId}`);
		return;
	}

	const settings = await createVotingSetting();

	if (!settings) {
		console.error("Error creating voting settings: ", settingsError);
		return;
	}
	form.value.votingSettings.value = settings[0].id;

	//Handle submit of a new vontest
	const newVontest = await createVontest();

	if (newVontest) {
		navigateTo(`/vontests/${newVontest?.id}`);
	}
};

const handleStepperClick = (index: number | string | undefined) => {
	// console.log(vontestForm);
	if (typeof index !== "number") {
		alert("Error with Stepper, clicked: " + index);
		return;
	}
	if (step.value < index) {
		step.value = index;
	} else if (index - step.value > 1) {
		return;
	} else {
		step.value = index;
	}
};
</script>
<template>
	<div class="flex flex-col items-center">
		<!-- Bind the form state via :state to UForm -->
		<UForm :state="form" class="w-1/2" @submit.prevent="publish">
			<UStepper
				ref="stepper"
				v-model="step"
                
				:items="stepperItems"
				@update:model-value="handleStepperClick"
			>
				<!-- Stepper -->

				<!-- Step 1: Basic Info -->
				<template #info>
					<div class="space-y-4">
						<UFormField name="title" label="Title">
							<UInput
								id="title"
								v-model="form.title.value"
								placeholder="What’s the best way to reduce urban noise?"
								required
								class="w-full"
							/>
						</UFormField>
						<UFormField name="description" label="Description">
							<ClientOnly>
								<!-- class="w-full rounded-[calc(var(--ui-radius)*1.5)] border-0 placeholder:text-(--ui-text-dimmed) focus:outline-none disabled:cursor-not-allowed disabled:opacity-75 transition-colors px-2.5 py-1.5 text-sm gap-1.5 text-(--ui-text-highlighted) bg-(--ui-bg) ring ring-inset ring-(--ui-border-accented) focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[--ui-primary]" -->
								<MdEditor
									id="description"
									v-model="form.description.value"
								/>
							</ClientOnly>
						</UFormField>
					</div>
				</template>

				<!-- Step 2: Proposal Settings -->
				<template #proposal>
					<div class="space-y-4">
						<UFormField
							name="proposalPermission"
							label="Who may add proposals?"
						>
							<URadioGroup
								v-model="
									form.proposalPermission
										.value as RadioGroupValue
								"
								:items="permissionOptions"
								variant="card"
							/>
						</UFormField>

						<div
							v-if="form.proposalPermission.value === 'creator'"
							class="space-y-2"
						>
							<h3>Options:</h3>
							<div class="text-xs text-gray-400 -mt-1">
								You can add more options later
							</div>
							<div
								v-for="(opt, i) in options"
								:key="i"
								class="flex items-center gap-2"
							>
								<UFormField
									:name="`options.${i}.label`"
									:label="'Option ' + (i + 1)"
								>
									<UInput
										v-model="options[i].label"
										required
									/>
								</UFormField>
								<UButton
									icon="i-lucide-x"
									variant="ghost"
									@click="removeOption(i)"
								/>
							</div>
							<UButton variant="subtle" @click="addOption"
								>+ Add another option</UButton
							>
						</div>
					</div>
				</template>

				<!-- Step 3: Voting Method -->
				<template #voting>
					<div class="space-y-4 w-2/3 mx-auto">
						<UFormField name="votingMethod" label="Voting Method">
							<USelect
								v-model="form.votingType.value"
								:items="votingMethods"
                                class="w-full"
							/>
						</UFormField>

						<div
							v-if="
								form.votingType.value === 'multiple' ||
								form.votingType.value === 'score' ||
								form.votingType.value === 'ranked' ||
								form.votingType.value === 'quadratic'
							"
                            class="ml-4"
						>
							<UFormField name="minVotes" label="Min votes">
								<UInput
									v-model="form.minVotes.value"
									type="number"
									class="w-full"
								/>
							</UFormField>
							<UFormField name="maxVotes" label="Max votes">
								<UInput
									v-model="form.maxVotes.value"
									type="number"
									class="w-full"
								/>
							</UFormField>
						</div>

						<div v-if="false">
							<UButton variant="outline" @click="toggleAdvanced">
								{{ showAdvanced ? "Hide" : "Custom" }} Settings
							</UButton>

							<UCollapsible v-model:open="showAdvanced">
								<template #content>
									<UFormField
										name="anonymity"
										label="Anonymity"
									>
										<URadioGroup
											v-model="anonymityValue"
											:items="anonymityOptions"
										/>
									</UFormField>
									<UFormField
										name="allowUpdate"
										label="Allow updates until close"
									>
										<UCheckbox
											v-model="form.allowRevoting.value"
										/>
									</UFormField>
									<!-- Add more custom controls as needed -->
								</template>
							</UCollapsible>
						</div>
					</div>
				</template>

				<!-- Step 4: Review & Publish -->
				<template #review>
					<div class="space-y-4">
						<UCard variant="subtle" class="p-4">
							<h3 class="text-lg font-semibold">
								Review your Vontest
							</h3>
							<p>
								<strong>Title:</strong> {{ form.title.value }}
							</p>
							<p>
								<strong>Description:</strong>
								{{ form.description.value || "—" }}
							</p>
							<p>
								<strong>Proposals by:</strong>
								{{
									form.proposalPermission.value === "creator"
										? "Only you"
										: "Anyone"
								}}
							</p>
							<div
								v-if="
									form.proposalPermission.value === 'creator'
								"
							>
								<strong>Options:</strong>
								<ul class="list-disc ml-6">
									<li v-for="(opt, i) in options" :key="i">
										{{ opt.label }}
									</li>
								</ul>
							</div>
							<p>
								<strong>Voting Method:</strong>
								{{ form.votingType }}
							</p>
                            <p>
                                <strong>Min votes:</strong>
                                {{ form.minVotes.value }}
                            </p>
                            <p>
                                <strong>Max votes:</strong>
                                {{ form.maxVotes.value }}
                            </p>
							<!-- <p>
								<strong>Anonymity:</strong>
								{{ anonymityValue }}<br />
								<strong>Allow updates:</strong>
								{{ form.allowRevoting ? "Yes" : "No" }}
							</p> -->
						</UCard>
					</div>
				</template>
			</UStepper>
			<!-- Stepper control buttons -->

			<div class="flex justify-between mt-4">
				<UButton
					variant="outline"
					:leading-icon="
						stepper?.hasPrev ? 'i-lucide-arrow-left' : ''
					"
					:trailing-icon="stepper?.hasPrev ? '' : 'i-lucide-x'"
					@click="stepper?.prev()"
					>{{ stepper?.hasPrev ? "Back" : "Cancel" }}</UButton
				>
				<UButton
					:loading="loading"
					:trailing-icon="
						stepper?.hasNext
							? 'i-lucide-arrow-right'
							: 'i-lucide-upload'
					"
					@click="stepper?.hasNext ? stepper?.next() : publish()"
					>{{ stepper?.hasNext ? "Next" : "Publish" }}</UButton
				>
			</div>
		</UForm>
	</div>
</template>
