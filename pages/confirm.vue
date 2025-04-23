<script setup lang="ts">
const user = useSupabaseUser()
const redirectInfo = useSupabaseCookieRedirect()

watch(user, () => {
  if (user.value) {
    const path = redirectInfo.pluck()
    if (path && path !== '/') {
      return navigateTo(path)
    }
  }
}, { immediate: true })

</script>

<template>
  <div>Waiting for login...</div>
</template>


