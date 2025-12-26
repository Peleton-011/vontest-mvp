<script setup lang="ts">
const props = defineProps<{
	open: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const user = useSupabaseUser();
const { profile, fetchProfile } = useProfile();

// Fetch profile when modal opens
watch(() => props.open, async (isOpen) => {
	if (isOpen && user.value) {
		await fetchProfile();
	}
});

// Menu items (same as the dropdown)
const menuItems = [
	{
		label: 'Profile Settings',
		icon: 'i-heroicons-user-circle',
		to: '/profile/settings'
	},
	{
		label: 'Log Out',
		icon: 'i-heroicons-arrow-right-on-rectangle',
		to: '/logout'
	}
];

const handleClose = () => {
	emit('update:open', false);
};

const handleMenuClick = (to: string) => {
	handleClose();
	navigateTo(to);
};

// Format date
const formatDate = (dateString: string | null) => {
	if (!dateString) return 'N/A';
	return new Date(dateString).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
};
</script>

<template>
	<UModal
		:open="open"
		:ui="{ content: 'max-w-md' }"
		@update:open="emit('update:open', $event)"
	>
		<template #body>
			<div class="space-y-6">
				<!-- Profile Header -->
				<div class="flex flex-col items-center text-center space-y-4">
					<UAvatar
						:src="profile?.avatar_url || ''"
						:alt="profile?.username || user?.email || 'User'"
						size="2xl"
						class="ring-4 ring-primary-500/20"
					/>
					<div>
						<h2 class="text-2xl font-bold text-gray-900 dark:text-white">
							{{ profile?.username || 'Anonymous User' }}
						</h2>
						<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
							{{ user?.email }}
						</p>
					</div>
				</div>

				<!-- Profile Stats -->
				<div class="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
					<div class="text-center">
						<p class="text-sm text-gray-600 dark:text-gray-400">Member Since</p>
						<p class="font-semibold text-gray-900 dark:text-white mt-1">
							{{ formatDate(profile?.created_at ?? "") }}
						</p>
					</div>
					<div class="text-center">
						<p class="text-sm text-gray-600 dark:text-gray-400">User ID</p>
						<p class="font-semibold text-gray-900 dark:text-white mt-1 text-xs truncate">
							{{ user?.id.slice(0, 8) }}...
						</p>
					</div>
				</div>

				<!-- Divider -->
				<div class="border-t border-gray-200 dark:border-gray-700"/>

				<!-- Menu Options -->
				<div class="space-y-2">
					<UButton
						v-for="item in menuItems"
                        :key="item.label"
                        variant="subtle"
						color="neutral"
						class="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left cursor-pointer"
						@click="handleMenuClick(item.to)"
					>
						<UIcon :name="item.icon" class="w-5 h-5 text-gray-600 dark:text-gray-400" />
						<span class="font-medium text-gray-900 dark:text-white">{{ item.label }}</span>
					</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>
