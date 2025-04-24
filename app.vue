<script setup lang="ts">
import LoginForm from './components/ui/auth/LoginForm.vue';

const user = useSupabaseUser();
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
        <LoginForm />
	</div>
</template>
