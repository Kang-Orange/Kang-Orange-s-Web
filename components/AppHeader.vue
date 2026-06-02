<script setup lang="ts">
const { user } = useAuth()
</script>

<template>
  <header class="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
      <NuxtLink to="/" class="text-indigo-400 font-bold text-xl tracking-wide hover:text-indigo-300 transition-colors">
        田园犬的狗窝
      </NuxtLink>
      <nav class="flex items-center gap-4">
        <NuxtLink v-if="user" to="/admin" class="text-indigo-400 hover:text-indigo-300 transition-colors text-sm">
          Admin
        </NuxtLink>
        <NuxtLink to="/about" class="text-gray-400 hover:text-gray-200 transition-colors text-sm">
          关于
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
