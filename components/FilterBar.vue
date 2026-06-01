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

// Group tags by category
const taggedGroups = computed(() => {
  const groups: Record<string, { name: string; category: string | null }[]> = {}
  for (const tag of allTags.value) {
    const key = tag.category || '其他'
    if (!groups[key]) groups[key] = []
    groups[key].push(tag)
  }
  return Object.entries(groups).sort(([a], [b]) => {
    // "其他" always last
    if (a === '其他') return 1
    if (b === '其他') return -1
    return a.localeCompare(b)
  })
})

// Track which groups are collapsed
const collapsedGroups = ref<Set<string>>(new Set())
function toggleGroup(name: string) {
  if (collapsedGroups.value.has(name)) {
    collapsedGroups.value.delete(name)
  } else {
    collapsedGroups.value.add(name)
  }
}

function selectedInGroup(tags: { name: string }[]) {
  return tags.filter(t => selectedTags.value.includes(t.name)).length
}
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

    <!-- Tag Groups -->
    <div class="space-y-2">
      <div v-for="[groupName, tags] in taggedGroups" :key="groupName">
        <!-- Group header -->
        <button
          @click="toggleGroup(groupName)"
          class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors py-0.5"
        >
          <span class="transition-transform" :class="collapsedGroups.has(groupName) ? '' : 'rotate-90'">
            &#9654;
          </span>
          <span>{{ groupName }}</span>
          <span v-if="selectedInGroup(tags) > 0" class="text-indigo-400">
            ({{ selectedInGroup(tags) }})
          </span>
        </button>

        <!-- Group chips -->
        <div v-if="!collapsedGroups.has(groupName)" class="flex flex-wrap gap-1.5 mt-1">
          <button
            v-for="tag in tags"
            :key="tag.name"
            @click="toggleTag(tag.name)"
            class="px-2.5 py-1 text-xs rounded-full border transition-colors"
            :class="selectedTags.includes(tag.name)
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'"
          >
            {{ tag.name }}
          </button>
        </div>
      </div>

      <button
        v-if="selectedTags.length > 0"
        @click="selectedTags.splice(0)"
        class="px-2.5 py-1 text-xs rounded-full text-gray-500 hover:text-gray-300 transition-colors mt-1"
      >
        清除筛选
      </button>
    </div>
  </div>
</template>
