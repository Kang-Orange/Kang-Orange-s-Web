<script setup lang="ts">
import type { SortField, SortOrder } from '~/composables/useVNData'

const {
  allTags,
  sortFieldLabels,
  searchQuery,
  selectedTags,
  sortField,
  sortOrder,
  toggleTag,
  setSortField
} = useVNData()

const sortFieldOptions: { value: SortField; label: string }[] = [
  { value: 'rating', label: '评分' },
  { value: 'release_date', label: '发行日期' },
  { value: 'play_date', label: '游玩日期' }
]
</script>

<template>
  <div class="space-y-4">
    <!-- Search + Sort Row -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">&#128269;</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索标题..."
          class="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-sm transition-colors"
        />
      </div>
      <div class="flex gap-1">
        <button
          v-for="opt in sortFieldOptions"
          :key="opt.value"
          @click="setSortField(opt.value)"
          class="px-3 py-2 text-xs rounded-lg border transition-colors"
          :class="sortField === opt.value
            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
            : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'"
        >
          {{ opt.label }}
          <span v-if="sortField === opt.value" class="ml-1">
            {{ sortOrder === 'desc' ? '&#8595;' : '&#8593;' }}
          </span>
        </button>
      </div>
    </div>

    <!-- Tag Filter Chips -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="tag in allTags"
        :key="tag"
        @click="toggleTag(tag)"
        class="px-2.5 py-1 text-xs rounded-full border transition-colors"
        :class="selectedTags.includes(tag)
          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
          : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'"
      >
        {{ tag }}
      </button>
      <button
        v-if="selectedTags.length > 0"
        @click="selectedTags.splice(0)"
        class="px-2.5 py-1 text-xs rounded-full text-gray-500 hover:text-gray-300 transition-colors"
      >
        清除筛选
      </button>
    </div>
  </div>
</template>
