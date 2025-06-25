<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

// Redirect to dashboard or home page
const redirectToDashboard = () => {
  router.push('/dashboard')
}
</script>

<template>
    <section class="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white">
      <u-card class="max-w-lg mx-auto p-6 bg-neutral-800 rounded-lg">
        <h1 class="text-3xl font-semibold text-neutral-100">Unauthorized Access</h1>
        <p class="mt-4 text-lg text-neutral-400">
          You do not have the necessary permissions to view this page. It looks like you need admin-level access to proceed.
        </p>
        <p class="mt-4 text-lg text-neutral-400">
          If you believe this is an error, please contact support or request access from an administrator.
        </p>
  
        <div class="mt-6">
          <!-- Redirect to dashboard or home -->
          <u-button size="lg" block class="font-bold" @click="redirectToDashboard">
            Go to Dashboard
            <u-icon name="i-lucide-home" class="ml-2" />
          </u-button>
        </div>
      </u-card>
    </section>
  </template>
  
