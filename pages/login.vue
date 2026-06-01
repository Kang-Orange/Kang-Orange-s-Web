<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { login } = useAuth()
const email = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function handleLogin() {
  error.value = ''
  submitting.value = true
  const { error: err } = await login(email.value, password.value)
  if (err) {
    error.value = err.message
  } else {
    await navigateTo('/admin')
  }
  submitting.value = false
}
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-20">
    <div class="bg-gray-800 border border-gray-700/50 rounded-lg p-8">
      <h1 class="text-xl font-bold text-white mb-6">Admin Login</h1>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-gray-400 text-sm mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 text-sm"
            placeholder="admin@vn.site"
          />
        </div>

        <div>
          <label class="block text-gray-400 text-sm mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>

        <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
        >
          {{ submitting ? 'Logging in...' : 'Login' }}
        </button>
      </form>
    </div>
  </div>
</template>
