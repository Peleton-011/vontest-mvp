<script setup lang="ts">
definePageMeta({
	middleware: 'auth'
});

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const router = useRouter();

const form = reactive({
	username: '',
	avatar_url: '',
});

const loading = ref(false);
const loadingProfile = ref(true);
const error = ref('');
const success = ref('');

// Load current profile
onMounted(async () => {
	if (!user.value) return;

	const { data: profile, error: fetchError } = await supabase
		.from('profiles')
		.select('username, avatar_url')
		.eq('id', user.value.id)
		.single();

	if (fetchError) {
		console.error('Error loading profile:', fetchError);
		error.value = 'Failed to load profile';
	} else if (profile) {
		form.username = profile.username || '';
		form.avatar_url = profile.avatar_url || '';
	}

	loadingProfile.value = false;
});

const updateProfile = async () => {
	if (!user.value) return;
	if (!form.username.trim()) {
		error.value = 'Username is required';
		return;
	}

	// Basic username validation
	if (form.username.length < 3 || form.username.length > 20) {
		error.value = 'Username must be between 3 and 20 characters';
		return;
	}

	if (!/^[a-zA-Z0-9_]+$/.test(form.username)) {
		error.value = 'Username can only contain letters, numbers, and underscores';
		return;
	}

	loading.value = true;
	error.value = '';
	success.value = '';

	try {
		// Check if username is already taken by someone else
		const { data: existing } = await supabase
			.from('profiles')
			.select('id')
			.eq('username', form.username)
			.neq('id', user.value.id)
			.single();

		if (existing) {
			error.value = 'Username is already taken';
			loading.value = false;
			return;
		}

		// Update profile
		const { error: updateError } = await supabase
			.from('profiles')
			.update({
				username: form.username,
				avatar_url: form.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${form.username}`,
			})
			.eq('id', user.value.id);

		if (updateError) throw updateError;

		success.value = 'Profile updated successfully!';

		// Clear success message after 3 seconds
		setTimeout(() => {
			success.value = '';
		}, 3000);
	} catch (e: any) {
		error.value = e.message || 'Failed to update profile';
	} finally {
		loading.value = false;
	}
};

const signOut = async () => {
	await supabase.auth.signOut();
	router.push('/login');
};
</script>

<template>
	<div class="container mx-auto px-4 py-8 max-w-2xl">
		<div class="mb-6">
			<h1 class="text-2xl sm:text-3xl font-bold">Profile Settings</h1>
			<p class="text-gray-400 mt-2">Manage your account settings</p>
		</div>

		<!-- Loading State -->
		<div v-if="loadingProfile" class="text-center py-12">
			<UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin mx-auto" />
			<p class="mt-4 text-gray-400">Loading profile...</p>
		</div>

		<!-- Profile Form -->
		<UCard v-else>
			<form @submit.prevent="updateProfile" class="space-y-6">
				<!-- Username -->
				<UFormGroup
					label="Username"
					required
					help="3-20 characters, letters, numbers, and underscores only"
				>
					<UInput
						v-model="form.username"
						placeholder="johndoe"
						size="lg"
						:disabled="loading"
						autocomplete="username"
					/>
				</UFormGroup>

				<!-- Avatar URL -->
				<UFormGroup
					label="Avatar URL"
					help="Leave blank to use an auto-generated avatar based on your username"
				>
					<UInput
						v-model="form.avatar_url"
						placeholder="https://example.com/avatar.jpg"
						size="lg"
						:disabled="loading"
						type="url"
					/>
				</UFormGroup>

				<!-- Preview -->
				<div v-if="form.username" class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
					<UAvatar
						:src="form.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${form.username}`"
						:alt="form.username"
						size="lg"
					/>
					<div>
						<p class="font-semibold">{{ form.username }}</p>
						<p class="text-sm text-gray-600 dark:text-gray-400">Preview</p>
					</div>
				</div>

				<!-- Success message -->
				<div v-if="success" class="text-green-600 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded">
					{{ success }}
				</div>

				<!-- Error message -->
				<div v-if="error" class="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded">
					{{ error }}
				</div>

				<!-- Actions -->
				<div class="flex gap-3">
					<UButton
						type="submit"
						size="lg"
						:loading="loading"
						:disabled="!form.username.trim()"
					>
						Save Changes
					</UButton>
					<UButton
						variant="outline"
						size="lg"
						@click="router.push('/')"
					>
						Cancel
					</UButton>
				</div>
			</form>
		</UCard>

		<!-- Danger Zone -->
		<UCard class="mt-8">
			<template #header>
				<h3 class="text-lg font-semibold text-red-600">Danger Zone</h3>
			</template>

			<div class="space-y-4">
				<div>
					<p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
						Sign out of your account
					</p>
					<UButton
						variant="outline"
						color="red"
						@click="signOut"
					>
						Sign Out
					</UButton>
				</div>
			</div>
		</UCard>
	</div>
</template>
