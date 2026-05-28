<script setup lang="ts">
defineProps<{
  rating: number
  size?: 'sm' | 'md'
}>()
</script>

<template>
  <span
    class="inline-flex items-center gap-1 bg-indigo-500/20 text-indigo-300 rounded font-semibold"
    :class="size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-sm'"
  >
    <span class="text-indigo-400">&#9670;</span>
    {{ rating.toFixed(1) }}
  </span>
</template>
