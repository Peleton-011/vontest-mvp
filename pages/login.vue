<script setup lang="ts">
const supabase = useSupabaseClient()
const router = useRouter()
const form = reactive({ email: '', password: '' })
const loading = ref(false)

const login = async () => {
  loading.value = true
  const { error } = await supabase.auth.signInWithPassword(form)
  if (error) alert(error.message)
  else router.push('/')
  loading.value = false
}

const loginWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
  if (error) alert(error.message)
}
</script>

<template>
  <div class="min-h-full flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <h2 class="mb-6 text-center text-3xl font-bold">
      Sign in to your account
    </h2>

    <LoginCard>
      <form @submit.prevent="login" class="space-y-4 mt-6">
        <UInput
          v-model="form.email"
          type="email"
          placeholder="you@example.com"
          required
          class="w-full"
        />
        <UInput
          v-model="form.password"
          type="password"
          placeholder="••••••••"
          required
          class="w-full"
        />
        <UButton type="submit" :loading="loading" class="w-full">
          Continue with Email
        </UButton>
        <!-- <UButton
          variant="outline"
          class="w-full"
          icon="i-simple-icons-google"
          @click="loginWithGoogle"
        >
          Sign in with Google
        </UButton> -->
      </form>
      <div class="mt-6 text-sm text-center">
        Don't have an account?
        <NuxtLink to="/signup" class="text-primary font-medium">Create one</NuxtLink>
      </div>
    </LoginCard>
  </div>
</template>
