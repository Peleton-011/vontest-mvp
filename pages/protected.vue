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

const upgrade = async (role: string) => {
	if (!user.value?.id) return;

	try {
		const response: { body: { data: any } } = await $fetch("/api/admin/promote", {
			method: "POST",
			body: {
				userId: user.value.id,
				role, // Pass the role (e.g., 'admin') in the body
			},
		});

		if ("data" in response.body) {
			res.value = response.body.data;
		} else {
			res.value = response.body;
		}
	} catch (error: any) {
		err.value = error?.message || "Something went wrong";
	}
};
</script>

<template>
	<div>
		<h1>Protected Page</h1>

		<button @click="logout">Logout</button>
		<button @click="upgrade('admin')">Upgrade to Admin</button>

		<div v-if="err">
			<p>Error: {{ err }}</p>
		</div>

		<div v-if="res && Object.keys(res).length > 0">
			<p>Success: {{ res }}</p>
		</div>
	</div>
</template>
