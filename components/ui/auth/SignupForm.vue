<script setup lang="ts">
const supabase = useSupabaseClient();
const router = useRouter();

const form = reactive({
	email: "",
	password: "",
});
const loading = ref(false);

const signup = async () => {
	loading.value = true;
	const { error } = await supabase.auth.signUp({
		email: form.email,
		password: form.password,
	});

	if (error) {
		alert(error.message);
	} else {
		router.push("/confirm");
	}
	loading.value = false;
};

const signUpWithEmail = async () => {
	if (import.meta.server) return;
	const { data, error } = await supabase.auth.signInWithOtp({
		email: form.email,
		options: {
			shouldCreateUser: true, // allow new user creation
			emailRedirectTo: window.location.origin + "/confirm/email",
		},
	});

	if (error) {
		alert(error.message);
	}
};
</script>

<template>
	<div class="flex flex-col gap-6 items-center justify-center">
		<UCard class="w-full max-w-md bg-neutral-800 text-white">
			<template #header>
				<div class="text-2xl font-semibold">Sign Up</div>
				<p class="text-gray-400">
					Enter your email below to create your account.
				</p>
			</template>

			<form @submit.prevent="signup" class="space-y-4">
				<div>
					<label
						for="email"
						class="block text-sm font-medium text-gray-300"
					>
						Email
					</label>
					<UInput
						id="email"
						v-model="form.email"
						type="email"
						placeholder="m@example.com"
						required
						class="mt-1 w-full"
					/>
				</div>

				<div>
					<label
						for="password"
						class="block text-sm font-medium text-gray-300"
					>
						Password
					</label>
					<UInput
						id="password"
						v-model="form.password"
						type="password"
						required
						class="mt-1 w-full"
					/>
				</div>

				<UButton
					type="submit"
					:loading="loading"
					trailing-icon="i-lucide-arrow-right"
					block
					class="font-bold"
				>
					Sign Up
				</UButton>

				<!-- <UButton
					variant="outline"
					@click.prevent="signUpWithEmail"
					trailing-icon="i-lucide-mail"
					block
					class="font-bold"
				>
					Sign Up with Magic Link
				</UButton> -->
			</form>

			<template #footer>
				<div class="mt-4 text-center text-sm text-gray-400">
					Already have an account?
					<NuxtLink
						to="/login"
						class="underline underline-offset-4 text-primary-400"
					>
						Login
					</NuxtLink>
				</div>
			</template>
		</UCard>
	</div>
</template>
