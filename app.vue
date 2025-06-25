<script setup lang="ts">
const user = useSupabaseUser();
</script>

<template>
	<div class="bg-neutral-900 min-h-screen text-white" data-vaul-drawer-wrapper>
		<Navbar />
		<NuxtPage />
	</div>
</template>
