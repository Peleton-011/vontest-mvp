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
const error = ref('');

// Check if user already has a profile
onMounted(async () => {
	if (!user.value) return;

	const { data: profile } = await supabase
		.from('profiles')
		.select('username, avatar_url')
		.eq('id', user.value.id)
		.single();

	if (profile?.username) {
		// User already has a username, redirect to home
		router.push('/');
	}
});

const createProfile = async () => {
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

	try {
		// Check if username is already taken
		const { data: existing } = await supabase
			.from('profiles')
			.select('id')
			.eq('username', form.username)
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

		// Redirect to home
		router.push('/');
	} catch (e: any) {
		error.value = e.message || 'Failed to create profile';
	} finally {
		loading.value = false;
	}
};
</script>

<template>
	<div class="min-h-[80vh] flex items-center justify-center px-4">
		<UCard class="w-full max-w-md">
			<template #header>
				<div>
					<h2 class="text-2xl font-bold">Complete Your Profile</h2>
					<p class="text-gray-600 mt-2">
						Let's set up your profile before you get started
					</p>
				</div>
			</template>

			<form @submit.prevent="createProfile" class="space-y-6">
				<!-- Username -->
				<UFormField label="Username" required help="3-20 characters, letters, numbers, and underscores only">
					<UInput
						v-model="form.username"
						placeholder="johndoe"
						:disabled="loading"
						autocomplete="username"
					/>
				</UFormField>

				<!-- Avatar URL (optional) -->
				<UFormField
					label="Avatar URL (optional)"
					help="Leave blank to use an auto-generated avatar"
				>
					<UInput
						v-model="form.avatar_url"
						placeholder="https://example.com/avatar.jpg"
						:disabled="loading"
						type="url"
					/>
				</UFormField>

				<!-- Preview -->
				<div v-if="form.username" class="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
					<UAvatar
						:src="form.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${form.username}`"
						:alt="form.username"
						size="lg"
					/>
					<div>
						<p class="font-semibold">{{ form.username }}</p>
						<p class="text-sm text-gray-600">Preview</p>
					</div>
				</div>

				<!-- Error message -->
				<div v-if="error" class="text-red-600 text-sm">
					{{ error }}
				</div>

				<!-- Submit -->
				<UButton
					type="submit"
					block
					:loading="loading"
					:disabled="!form.username.trim()"
				>
					Complete Setup
				</UButton>
			</form>
		</UCard>
	</div>
</template>
