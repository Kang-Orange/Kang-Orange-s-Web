<script setup lang="ts">
import type { VNEntry } from '~/composables/useVNData'

defineProps<{
  vn: VNEntry
}>()
</script>

<template>
  <NuxtLink
    :to="'/vn/' + vn.id"
    class="group block bg-gray-800 rounded-lg overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-indigo-500/10"
  >
    <CoverImage :src="vn.cover_url" :alt="vn.title" />
    <div class="p-4 space-y-2">
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-white font-bold truncate">{{ vn.title }}</h3>
        <StatusBadge :status="vn.status" />
      </div>
      <p class="text-gray-500 text-xs italic truncate">{{ vn.original_title }}</p>
      <div class="flex items-center justify-between">
        <RatingDisplay :rating="vn.rating" size="sm" />
        <span class="text-gray-500 text-xs">{{ vn.play_time }}</span>
      </div>
      <TagList :tags="vn.tags" :max="3" />
    </div>
  </NuxtLink>
</template>
