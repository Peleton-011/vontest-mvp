<template>
	<div class="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-2xl">
		<div class="mb-6 sm:mb-8">
			<UButton
				to="/games"
				variant="ghost"
				icon="i-heroicons-arrow-left"
				class="mb-4"
			>
				Back to Groups
			</UButton>
			<h1 class="text-2xl sm:text-3xl font-bold">Create New Group</h1>
			<p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
				Create a group to play daily social games with your friends
			</p>
		</div>

		<UCard>
			<form class="space-y-6" @submit.prevent="handleSubmit">
				<!-- Group Name -->
				<UFormField
					label="Group Name"
					name="name"
					required
					help="Choose a name for your group (3-50 characters)"
				>
					<UInput
						v-model="form.name.value"
						placeholder="e.g., College Friends, Book Club, Family"
						:maxlength="50"
						size="lg"
						:disabled="loading"
						autofocus
					/>
				</UFormField>

				<!-- Group Avatar -->
				<UFormField
					label="Group Avatar"
					name="avatar"
					help="Upload an image or enter a URL for your group's avatar (optional)"
				>
					<UiImageUpload
						v-model="form.avatar_url.value"
						:disabled="loading"
						alt="Group Avatar"
						bucket="group-avatars"
					/>
				</UFormField>

				<!-- Description -->
				<UFormField
					label="Description"
					name="description"
					help="Optional description (max 500 characters)"
				>
					<UTextarea
						v-model="form.description.value"
						placeholder="What's this group about?"
						:maxlength="500"
						:rows="3"
						size="lg"
						:disabled="loading"
					/>
				</UFormField>

				<!-- Enabled Games -->
				<UFormField
					label="Select Games"
					name="enabled_games"
					required
					help="Choose which games this group will play (select at least one)"
				>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div
							v-for="gameType in availableGames"
							:key="gameType.id"
							class="relative"
						>
							<label
								:for="`game-${gameType.id}`"
								class="flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all"
								:class="[
									isGameSelected(gameType.id)
										? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
										: 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700',
									loading ? 'opacity-50 cursor-not-allowed' : ''
								]"
							>
								<input
									:id="`game-${gameType.id}`"
									type="checkbox"
									:value="gameType.id"
									:checked="isGameSelected(gameType.id)"
									:disabled="loading"
									class="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
									@change="toggleGame(gameType.id)"
								>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-1">
										<UIcon
											:name="gameType.icon"
											class="w-5 h-5"
											:class="getGameColorClasses(gameType.color).iconLarge"
										/>
										<span class="font-medium text-sm">{{ gameType.name }}</span>
									</div>
									<p class="text-xs text-gray-600 dark:text-gray-400">
										{{ gameType.description }}
									</p>
									<p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
										Min. {{ gameType.minPlayers }} players
									</p>
								</div>
							</label>
						</div>
					</div>
					<p v-if="form.enabled_games.value.length === 0" class="text-xs text-red-500 mt-2">
						Please select at least one game type
					</p>
				</UFormField>

				<!-- Notification Settings -->
				<UFormField
					label="Daily Game Time"
					name="notification_time"
					help="When should new games be created each day?"
				>
					<UInput
						v-model="form.notification_time.value"
						type="time"
						size="lg"
						:disabled="loading"
					/>
				</UFormField>

				<!-- Timezone -->
				<UFormField
					label="Timezone"
					name="timezone"
					help="Select your timezone"
				>
					<USelect
						v-model="form.timezone.value"
						:items="timezones"
						:disabled="loading"
					/>
				</UFormField>

				<!-- Error Display -->
				<UAlert
					v-if="error"
					color="error"
					variant="soft"
					title="Error creating group"
					:description="error.message"
				/>

				<!-- Success Message -->
				<UAlert
					v-if="successMessage"
					color="success"
					variant="soft"
					title="Success!"
					:description="successMessage"
				/>

				<!-- Actions -->
				<div class="flex flex-col sm:flex-row gap-3">
					<UButton
						type="submit"
						size="lg"
						class="w-full sm:w-auto"
						:loading="loading"
						:disabled="!isFormValid || loading"
					>
						Create Group
					</UButton>
					<UButton
						type="button"
						variant="ghost"
						size="lg"
						class="w-full sm:w-auto"
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
import { getAllGameTypes, getGameColorClasses, type GameType } from '~/types/games';

definePageMeta({
	middleware: 'auth',
	layout: 'default',
});

const { form, createGroup, loading, error, isFormValid, resetForm } = useGroups();

const successMessage = ref('');

// Get all available game types
const availableGames = getAllGameTypes();

// Helper to check if a game is selected
const isGameSelected = (gameId: GameType): boolean => {
	return form.enabled_games.value.includes(gameId);
};

// Helper to toggle game selection
const toggleGame = (gameId: GameType) => {
	const index = form.enabled_games.value.indexOf(gameId);
	if (index > -1) {
		// Remove if already selected
		form.enabled_games.value.splice(index, 1);
	} else {
		// Add if not selected
		form.enabled_games.value.push(gameId);
	}
};

// Common timezones formatted for USelect
const timezones = [
	{ label: 'UTC', value: 'UTC' },
	{ label: 'Eastern (New York)', value: 'America/New_York' },
	{ label: 'Central (Chicago)', value: 'America/Chicago' },
	{ label: 'Mountain (Denver)', value: 'America/Denver' },
	{ label: 'Pacific (Los Angeles)', value: 'America/Los_Angeles' },
	{ label: 'London', value: 'Europe/London' },
	{ label: 'Paris', value: 'Europe/Paris' },
	{ label: 'Berlin', value: 'Europe/Berlin' },
	{ label: 'Tokyo', value: 'Asia/Tokyo' },
	{ label: 'Shanghai', value: 'Asia/Shanghai' },
	{ label: 'Sydney', value: 'Australia/Sydney' },
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
