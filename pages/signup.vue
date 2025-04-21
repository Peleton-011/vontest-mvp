<script setup lang="ts">
definePageMeta({
	middleware: "unauthenticated",
});

const supaAuth = useSupabaseClient().auth;

const credentials = reactive({
	email: "",
	password: "",
});

const signup = async () => {
	const { error } = await supaAuth.signUp(credentials);
	if (error) {
		alert(error.message);
	} else {
        return navigateTo("/");
    }
};
</script>
<template>
	<div>
		<h1>Login Page</h1>
		<form @submit.prevent="signup">
			<input
				v-model="credentials.email"
				type="email"
				placeholder="Email"
			/>
			<input
				v-model="credentials.password"
				type="password"
				placeholder="Password"
			/>
			<button type="submit">Login</button>
		</form>
	</div>
</template>
