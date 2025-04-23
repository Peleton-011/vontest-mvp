export default defineNuxtRouteMiddleware((to, _from) => {
	const user = useSupabaseUser();
	if (!user.value) {
		return navigateTo("/login");
	}
});

/*
  USE:

  <script setup>
definePageMeta({
  middleware: 'auth'
})
</script>
  */
