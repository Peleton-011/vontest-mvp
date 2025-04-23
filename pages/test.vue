<template>
    <div style="padding: 2rem; font-family: sans-serif;">
      <h1>Vue 3 Signup Test</h1>
  
      <form @submit.prevent="handleSignup" class="space-y-4">
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          required
          style="display: block; padding: 0.5rem; margin-bottom: 1rem;"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          required
          style="display: block; padding: 0.5rem; margin-bottom: 1rem;"
        />
        <button type="submit" style="padding: 0.5rem 1rem;">
          Create Account
        </button>
      </form>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  
  const email = ref('')
  const password = ref('')
  
  const handleSignup = () => {
    alert(`Signup triggered!\nEmail: ${email.value}\nPassword: ${password.value}`)
  }
  </script>
  