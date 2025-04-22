<script setup lang="ts">
const user = false; // useSupabaseUser();

const supabase = useSupabaseClient()

const config = useRuntimeConfig()
console.log(config.public) // should show the Supabase keys

</script>

<template>
	<div>
		<nav>
			<ul>
				<li><NuxtLink to="/">Home</NuxtLink></li>
				<li v-if="!user">
					<NuxtLink to="/login">Login</NuxtLink>
				</li>
				<li v-if="!user">
					<NuxtLink to="/signup">Signup</NuxtLink>
				</li>
				<li v-else>
					<NuxtLink to="/protected">Protected</NuxtLink>
				</li>
			</ul>
		</nav>
		<NuxtPage />
	</div>
</template>
