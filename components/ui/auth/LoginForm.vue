<template>
	<div class="flex flex-col gap-6 items-center justify-center">
		<UCard class="w-1/3">
			<template #header>
				<div class="text-2xl font-semibold">Login</div>
				<p class="text-gray-500">
					Enter your email below to login to your account
				</p>
			</template>

			<form @submit.prevent="login" class="space-y-4">
				<div>
					<label
						for="email"
						class="block text-sm font-medium text-gray-700"
						>Email</label
					>
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
					<div class="flex items-center justify-between">
						<label
							for="password"
							class="block text-sm font-medium text-gray-700"
							>Password</label
						>
						<NuxtLink
							to="#"
							class="text-sm text-blue-600 hover:underline"
							>Forgot your password?</NuxtLink
						>
					</div>
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
					Login
				</UButton>
				<UButton
					variant="outline"
					@click.prevent="signInWithEmail"
					trailing-icon="i-lucide-mail"
					block
					class="font-bold"
				>
					Login with Magic Link
				</UButton>
			</form>

			<template #footer>
				<div class="mt-4 text-center text-sm">
					Don’t have an account?
					<NuxtLink to="/signup" class="underline underline-offset-4">
						Sign up
					</NuxtLink>
				</div>
			</template>
		</UCard>
	</div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient();
const router = useRouter();

const form = reactive({
	email: "",
	password: "",
});
const loading = ref(false);

const login = async () => {
	loading.value = true;
	const { error } = await supabase.auth.signInWithPassword(form);
	if (error) {
		alert(error.message);
	} else {
		router.push("/");
	}
	loading.value = false;
};

async function signInWithEmail() {
	if (import.meta.server) return;
	const { data, error } = await supabase.auth.signInWithOtp({
		email: form.email,
		options: {
			// set this to false if you do not want the user to be automatically signed up
			shouldCreateUser: false,
			emailRedirectTo: window.location.origin,
		},
	});
}
</script>
