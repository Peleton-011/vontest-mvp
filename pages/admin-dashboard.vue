<script setup lang="ts">
// Ensure this page is protected
import type { User } from "@supabase/supabase-js";

definePageMeta({
	middleware: "admin",
});

const currentUser = useSupabaseUser();
const supabase = useSupabaseClient();
const users = ref<User[]>([]);
const loading = ref(false);
const error = ref("");

onMounted(async () => {
	await fetchUsers();
});

const fetchUsers = async () => {
	try {
		const response = await fetch("/api/admin/users");
		const { body: result } = await response.json();
		if (response.ok) {
			// Sort users so the current user is first
			users.value = result.users.sort((userA: User) => {
				return userA.id === currentUser.value?.id ? -1 : 1;
			});
		} else {
			error.value = result.error;
		}
	} catch (err) {
		error.value = "Failed to fetch users: " + err;
	} finally {
		loading.value = false;
	}
};

const toggleAdminRole = async (user: User) => {
	const newRole = user.app_metadata?.role === "admin" ? "user" : "admin";
	const { error: updateError } = await supabase.auth.admin.updateUserById(
		user.id,
		{
			app_metadata: { role: newRole },
		}
	);

	if (updateError) {
		alert("Failed to update role: " + updateError.message);
	} else {
		await fetchUsers(); // Refresh user list
	}
};
</script>

<template>
	<div class="p-8">
		<h1 class="text-3xl font-bold mb-6">Admin Dashboard</h1>

		<UCard>
			<template #header>
				<div class="text-xl font-semibold">Manage Users</div>
			</template>

			<div v-if="loading" class="text-center p-4">Loading users...</div>
			<div v-else-if="error" class="text-red-500 p-4">{{ error }}</div>
			<div v-else class="overflow-x-auto">
				<table class="min-w-full text-left border">
					<thead class="bg-gray-100 dark:bg-gray-800">
						<tr>
							<th class="px-4 py-2 border-b">Email</th>
							<th class="px-4 py-2 border-b">Role</th>
							<th class="px-4 py-2 border-b">Actions</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="user in users"
							:key="user.id"
							class="border-b"
						>
							<td class="px-4 py-2">{{ user.email }}</td>
							<td class="px-4 py-2">
								{{ user.app_metadata?.role || "user" }}
							</td>
							<td class="px-4 py-2">
								<UButton
									v-if="user.id === currentUser?.id"
									size="sm"
									variant="outline"
									color="primary"
								>
									You
								</UButton>
								<UButton
									v-else
									size="sm"
									variant="outline"
									color="primary"
									@click="toggleAdminRole(user)"
								>
									{{
										user.app_metadata?.role === "admin"
											? "Demote to User"
											: "Promote to Admin"
									}}
								</UButton>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<template #footer>
				<div class="text-sm text-gray-500">
					Only admins can see this page.
				</div>
			</template>
		</UCard>
	</div>
</template>
