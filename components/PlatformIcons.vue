<script setup lang="ts">
defineProps<{
  platforms: string[]
}>()
</script>

<template>
  <span v-if="platforms.length > 0" class="inline-flex items-center gap-1.5">
    <img
      v-for="p in platforms"
      :key="p"
      :src="`/icons/${p}.svg`"
      :alt="p"
      :title="p"
      class="w-5 h-5 text-gray-400 select-none"
      @error="($event.target as HTMLImageElement).style.display = 'none'"
    />
  </span>
</template>
