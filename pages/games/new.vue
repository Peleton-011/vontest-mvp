<template>
	<div class="container mx-auto px-4 py-8 max-w-2xl">
		<div class="mb-8">
			<UButton
				to="/games"
				variant="ghost"
				icon="i-heroicons-arrow-left"
				class="mb-4"
			>
				Back to Groups
			</UButton>
			<h1 class="text-3xl font-bold">Create New Group</h1>
			<p class="text-gray-600 mt-2">
				Create a group to play daily social games with your friends
			</p>
		</div>

		<UCard>
			<form @submit.prevent="handleSubmit" class="space-y-6">
				<!-- Group Name -->
				<UFormGroup
					label="Group Name"
					name="name"
					required
					help="Choose a name for your group (3-50 characters)"
				>
					<UInput
						v-model="form.name"
						placeholder="e.g., College Friends, Book Club, Family"
						:maxlength="50"
						size="lg"
						:disabled="loading"
						autofocus
					/>
				</UFormGroup>

				<!-- Description -->
				<UFormGroup
					label="Description"
					name="description"
					help="Optional description (max 500 characters)"
				>
					<UTextarea
						v-model="form.description"
						placeholder="What's this group about?"
						:maxlength="500"
						:rows="3"
						:disabled="loading"
					/>
				</UFormGroup>

				<!-- Enabled Games -->
				<UFormGroup
					label="Select Games"
					name="enabled_games"
					required
					help="Choose which games this group will play"
				>
					<div class="space-y-2">
						<UCheckbox
							v-model="form.enabled_games"
							value="would_you_rather"
							label="Would You Rather (Ranked)"
							:disabled="loading"
						/>
						<UCheckbox
							v-model="form.enabled_games"
							value="hot_takes"
							label="Hot Takes (Debate)"
							:disabled="loading"
						/>
						<UCheckbox
							v-model="form.enabled_games"
							value="guess_who_said_it"
							label="Guess Who Said It"
							:disabled="loading"
						/>
						<UCheckbox
							v-model="form.enabled_games"
							value="most_likely_to"
							label="Most Likely To"
							:disabled="loading"
						/>
					</div>
				</UFormGroup>

				<!-- Notification Settings -->
				<UFormGroup
					label="Daily Game Time"
					name="notification_time"
					help="When should new games be created each day?"
				>
					<UInput
						v-model="form.notification_time"
						type="time"
						:disabled="loading"
					/>
				</UFormGroup>

				<!-- Timezone -->
				<UFormGroup
					label="Timezone"
					name="timezone"
					help="Select your timezone"
				>
					<USelect
						v-model="form.timezone"
						:options="timezones"
						:disabled="loading"
					/>
				</UFormGroup>

				<!-- Error Display -->
				<UAlert
					v-if="error"
					color="red"
					variant="soft"
					title="Error creating group"
					:description="error.message"
				/>

				<!-- Success Message -->
				<UAlert
					v-if="successMessage"
					color="green"
					variant="soft"
					title="Success!"
					:description="successMessage"
				/>

				<!-- Actions -->
				<div class="flex gap-3">
					<UButton
						type="submit"
						size="lg"
						:loading="loading"
						:disabled="!isFormValid || loading"
					>
						Create Group
					</UButton>
					<UButton
						type="button"
						variant="ghost"
						size="lg"
						:disabled="loading"
						@click="navigateTo('/games')"
					>
						Cancel
					</UButton>
				</div>
			</form>
		</UCard>
	</div>
</template>

<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'default',
});

const { form, createGroup, loading, error, isFormValid, resetForm } = useGroups();

const successMessage = ref('');

// Common timezones
const timezones = [
	'UTC',
	'America/New_York',
	'America/Chicago',
	'America/Denver',
	'America/Los_Angeles',
	'Europe/London',
	'Europe/Paris',
	'Europe/Berlin',
	'Asia/Tokyo',
	'Asia/Shanghai',
	'Australia/Sydney',
];

const handleSubmit = async () => {
	successMessage.value = '';
	error.value = null;

	const result = await createGroup();

	if (result) {
		successMessage.value = `Group "${result.name}" created successfully!`;

		// Redirect to the new group page after short delay
		setTimeout(() => {
			navigateTo(`/games/${result.id}`);
		}, 1500);
	}
};

// Reset form when component unmounts
onUnmounted(() => {
	resetForm();
});
</script>
