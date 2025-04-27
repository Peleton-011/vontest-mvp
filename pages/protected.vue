<script setup lang="ts">
const user = useSupabaseUser();
const res = ref<object>({});
const err = ref<string>("");

const logout = async () => {
	const { error } = await useSupabaseClient().auth.signOut();
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

		<button @click="logout">Logout</button>

	</div>
</template>
