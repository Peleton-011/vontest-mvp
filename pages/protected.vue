<script setup lang="ts">
definePageMeta({
	middleware: "authenticated",
});

const supaAuth = useSupabaseClient().auth;

const logout = async () => {
	const { error } = await supaAuth.signOut();
	if (error) {
		alert(error.message);
	} else {
		return navigateTo("/login");
	}
};
</script>
<template>
	<div>
		<h1>Protected Page</h1>
	</div>

	<button @click="logout">Logout</button>
</template>
