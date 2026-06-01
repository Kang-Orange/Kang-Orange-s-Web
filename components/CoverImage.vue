<script setup lang="ts">
defineProps<{
  src: string
  alt: string
}>()

const error = ref(false)
</script>

<template>
  <div :style="{ aspectRatio: useCoverConfig().aspectRatio }" class="bg-gray-700 rounded-t-lg overflow-hidden relative group">
    <img
      v-if="!error"
      :src="src"
      :alt="alt"
      class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      @error="error = true"
    />
    <div v-else class="w-full h-full flex items-center justify-center text-gray-500 text-sm">
      No Cover
    </div>
    <div class="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
  </div>
</template>
