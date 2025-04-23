<script setup lang="ts">
const supabase = useSupabaseClient();
const router = useRouter();
const form = reactive({ email: "", password: "" });
const loading = ref(false);

const signup = async () => {
	console.log(`email: ${form.email}, password: ${form.password}`);

	loading.value = true;
	const { error } = await supabase.auth.signUp(form);
	if (error) alert(error?.message);
	else router.push("/");
	loading.value = false;
};

const signupWithGoogle = async () => {
	const { error } = await supabase.auth.signInWithOAuth({
		provider: "google",
	});
	if (error) alert(error.message);
};
</script>

<template>
	<div class="min-h-full flex flex-col justify-center py-12 sm:px-6 lg:px-8">
		<h2 class="mb-6 text-center text-3xl font-bold">Create your account</h2>
		<LoginCard>
			<UInput
				v-model="form.email"
				type="email"
				placeholder="you@example.com"
				required
				class="w-full"
				name="email"
			/>
			<UInput
				v-model="form.password"
				type="password"
				placeholder="••••••••"
				required
				class="w-full"
				name="password"
			/>
		</LoginCard>

		<form @submit.prevent="signup" class="space-y-4 mt-6">
			<UButton
				as="button"
				type="submit"
				:loading="loading"
				class="w-full"
			>
				Create Account
			</UButton>
			<!-- <UButton
          variant="outline"
          class="w-full"
          icon="i-simple-icons-google"
          @click="signupWithGoogle"
        >
          Sign up with Google
        </UButton> -->
		</form>
		<div class="mt-6 text-sm text-center">
			Already have an account?
			<NuxtLink to="/login" class="text-primary font-medium"
				>Log in</NuxtLink
			>
		</div>
	</div>
</template>
