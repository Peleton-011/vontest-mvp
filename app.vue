<script setup lang="ts">
const user = useSupabaseUser();
</script>

<template>
	<div class="bg-neutral-900 min-h-screen text-white">
		<Navbar />
		<NuxtPage />
	</div>
</template>
