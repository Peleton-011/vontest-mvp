<script setup lang="ts">
import { ref } from "vue";
import type { RadioGroupItem, RadioGroupValue, StepperItem } from "@nuxt/ui";

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
		label: "Participants",
		description: "Anyone can add proposals",
		value: "participants",
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

const title = ref("");
const description = ref("");
const proposalPermission = ref<RadioGroupValue>("participants");
const options = ref([{ label: "" }, { label: "" }]);
const votingMethod = ref("single");
const showAdvanced = ref(false);
const advancedSettings = ref<{
	anonymity: RadioGroupValue;
	allowUpdate: boolean;
}>({ anonymity: "public", allowUpdate: false });

const formState = ref({
	title: "",
	description: "",
	proposalPermission: "creator",
	options: [{ label: "" }, { label: "" }],
	votingMethod: "single",
	showAdvanced: false,
	advancedSettings: { anonymity: "public", allowUpdate: false },
});

const addOption = () => {
	options.value.push({ label: "" });
};
const removeOption = (i: number) => {
	options.value.splice(i, 1);
};
const toggleAdvanced = () => {
	showAdvanced.value = !showAdvanced.value;
};

const publish = () => {
	// Placeholder: handle form submission
	console.log("Publishing vontest", {
		title: title.value,
		description: description.value,
		proposalPermission: proposalPermission.value,
		options: optionLabels.value,
		votingMethod: votingMethod.value,
		advancedSettings: advancedSettings.value,
	});
};

const optionLabels = computed(() => options.value.map((o) => o.label));
</script>
<template>
	<div class="flex flex-col items-center">
		<!-- Bind the form state via :state to UForm -->
		<UForm :state="formState" class="w-1/3" @submit.prevent="publish">
			<UStepper ref="stepper" :items="stepperItems">
				<!-- Stepper -->

				<!-- Step 1: Basic Info -->
				<template #info>
					<div class="space-y-4">
						<UFormField name="title" label="Title">
							<UInput v-model="title" required />
						</UFormField>
						<UFormField name="description" label="Description">
							<UTextarea v-model="description" />
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
								v-model="proposalPermission"
								:items="permissionOptions"
								variant="card"
							/>
						</UFormField>

						<div
							v-if="proposalPermission === 'creator'"
							class="space-y-2"
						>
							<div
								v-for="(opt, i) in options"
								:key="i"
								class="flex items-center gap-2"
							>
								<UFormField
									:name="`options.${i}.label`"
									label="Option"
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
					<div class="space-y-4">
						<UFormField name="votingMethod" label="Voting Method">
							<USelect
								v-model="votingMethod"
								:items="[
									{ label: 'Single choice', value: 'single' },
									{
										label: 'Multiple choice',
										value: 'multiple',
									},
									{ label: 'Ranked choice', value: 'ranked' },
									{ label: 'Score voting', value: 'score' },
								]"
							/>
						</UFormField>

						<UButton variant="outline" @click="toggleAdvanced">
							{{ showAdvanced ? "Hide" : "Custom" }} Settings
						</UButton>
						<UCollapsible v-model:open="showAdvanced">
							<template #content>
								<UFormField name="anonymity" label="Anonymity">
									<URadioGroup
										v-model="advancedSettings.anonymity"
										:items="anonymityOptions"
									/>
								</UFormField>
								<UFormField
									name="allowUpdate"
									label="Allow updates until close"
								>
									<UCheckbox
										v-model="advancedSettings.allowUpdate"
									/>
								</UFormField>
								<!-- Add more custom controls as needed -->
							</template>
						</UCollapsible>
					</div>
				</template>

				<!-- Step 4: Review & Publish -->
				<template #review>
					<div class="space-y-4">
						<UCard variant="subtle" class="p-4">
							<h3 class="text-lg font-semibold">
								Review your Vontest
							</h3>
							<p><strong>Title:</strong> {{ title }}</p>
							<p>
								<strong>Description:</strong>
								{{ description || "—" }}
							</p>
							<p>
								<strong>Proposals by:</strong>
								{{
									proposalPermission === "creator"
										? "Only you"
										: "Participants"
								}}
							</p>
							<div v-if="proposalPermission === 'creator'">
								<strong>Options:</strong>
								<ul class="list-disc ml-6">
									<li v-for="(opt, i) in options" :key="i">
										{{ opt.label }}
									</li>
								</ul>
							</div>
							<p>
								<strong>Voting Method:</strong>
								{{ votingMethod }}
							</p>
							<p>
								<strong>Anonymity:</strong>
								{{ advancedSettings.anonymity }}<br />
								<strong>Allow updates:</strong>
								{{
									advancedSettings.allowUpdate ? "Yes" : "No"
								}}
							</p>
						</UCard>
					</div>
				</template>
			</UStepper>
			<!-- Stepper control buttons -->

			<div class="flex justify-between">
				<UButton
					v-if="stepper?.hasPrev"
					variant="outline"
					leading-icon="i-lucide-arrow-left"
					@click="stepper?.prev()"
					>Back</UButton
				>
				<UButton 
                    v-if="stepper?.hasNext"
                    leading-icon="i-lucide-arrow-right"
                    @click="stepper?.hasNext? stepper?.next() : publish()"
                >{{ stepper?.hasNext ? "Next" : "Publish" }}</UButton>

			</div>
		</UForm>
	</div>
</template>
