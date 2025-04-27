<template>
    <div class="flex flex-col gap-6 items-center justify-center">
      <UCard class="w-full max-w-md bg-neutral-800 text-white">
        <template #header>
          <div class="text-2xl font-semibold">Login</div>
          <p class="text-gray-400">
            Enter your email below to login to your account.
          </p>
        </template>
  
        <form @submit.prevent="login" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-300">
              Email
            </label>
            <UInput
              id="email"
              v-model="form.email"
              type="email"
              placeholder="m@example.com"
              required
              class="mt-1 w-full"
            />
          </div>
  
          <div>
            <div class="flex items-center justify-between">
              <label
                for="password"
                class="block text-sm font-medium text-gray-300"
              >
                Password
              </label>
              <NuxtLink
                to="#"
                class="text-sm text-primary-400 hover:underline"
              >
                Forgot your password?
              </NuxtLink>
            </div>
            <UInput
              id="password"
              v-model="form.password"
              type="password"
              required
              class="mt-1 w-full"
            />
          </div>
  
          <UButton
            type="submit"
            :loading="loading"
            trailing-icon="i-lucide-arrow-right"
            block
            class="font-bold"
          >
            Login
          </UButton>
  
          <UButton
            variant="outline"
            @click.prevent="signInWithEmail"
            trailing-icon="i-lucide-mail"
            block
            class="font-bold"
          >
            Login with Magic Link
          </UButton>
        </form>
  
        <template #footer>
          <div class="mt-4 text-center text-sm text-gray-400">
            Don’t have an account?
            <NuxtLink to="/signup" class="underline underline-offset-4 text-primary-400">
              Sign up
            </NuxtLink>
          </div>
        </template>
      </UCard>
    </div>
  </template>
  
  <script setup lang="ts">
  const supabase = useSupabaseClient();
  const router = useRouter();
  
  const form = reactive({
    email: "",
    password: "",
  });
  const loading = ref(false);
  
  const login = async () => {
    loading.value = true;
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
  
    if (error) {
      alert(error.message);
    } else {
      router.push("/");
    }
    loading.value = false;
  };
  
  const signInWithEmail = async () => {
    if (import.meta.server) return;
    const { data, error } = await supabase.auth.signInWithOtp({
      email: form.email,
      options: {
        shouldCreateUser: false, // important for login-only
        emailRedirectTo: window.location.origin,
      },
    });
  
    if (error) {
      alert(error.message);
    }
  };
  </script>
  