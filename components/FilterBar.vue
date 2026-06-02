<script setup lang="ts">
import type { SortField, SortOrder } from '~/composables/useVNData'
import { GAME_TYPES } from '~/composables/useVNData'

const {
  allTags,
  searchQuery,
  selectedTags,
  selectedGameType,
  sortField,
  sortOrder,
  toggleTag,
  setSortField
} = useVNData()

const sortFieldOptions: { value: SortField; label: string }[] = [
  { value: 'rating', label: '评分' },
  { value: 'release_date', label: '发行日期' },
  { value: 'play_date', label: '通关日期' }
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

// Filter popup visibility
const showFilterPopup = ref(false)

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
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
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

    <!-- Game Type Filter + Filter Popup Trigger -->
    <div class="flex items-center justify-between">
      <!-- Left: type filter -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500 flex-shrink-0">类型</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            @click="selectedGameType = null"
            class="px-2.5 py-1 text-xs rounded-full border transition-colors"
            :class="selectedGameType === null
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'"
          >
            ALL
          </button>
          <button
            v-for="gt in GAME_TYPES"
            :key="gt"
            @click="selectedGameType = selectedGameType === gt ? null : gt"
            class="px-2.5 py-1 text-xs rounded-full border transition-colors"
            :class="selectedGameType === gt
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'"
          >
            {{ gt }}
          </button>
        </div>
      </div>

      <!-- Right: filter popup trigger -->
      <div class="relative">
        <button
          @click="showFilterPopup = !showFilterPopup"
          class="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors flex-shrink-0"
          :class="showFilterPopup || selectedTags.length > 0
            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
            : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'"
        >
          <!-- Funnel icon -->
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>过滤器</span>
          <span v-if="selectedTags.length > 0" class="text-indigo-400">({{ selectedTags.length }})</span>
        </button>

        <!-- Filter Popup -->
        <Teleport to="body">
          <div v-if="showFilterPopup" class="fixed inset-0 z-50" @click.self="showFilterPopup = false">
            <div
              class="absolute left-4 right-4 top-20 sm:left-auto sm:right-6 sm:top-24 sm:w-72 max-h-[60vh] bg-gray-900 border border-gray-600 rounded-xl shadow-2xl shadow-black/70 overflow-hidden flex flex-col"
              @click.stop
            >
              <!-- Popup header -->
              <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                <span class="text-sm font-semibold text-gray-200">过滤器</span>
                <button
                  @click="showFilterPopup = false"
                  class="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <!-- Popup body -->
              <div class="overflow-y-auto px-4 py-3 space-y-2">
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
                  class="px-2.5 py-1 text-xs rounded-full text-gray-500 hover:text-gray-300 transition-colors"
                >
                  清除筛选
                </button>
              </div>
            </div>
          </div>
        </Teleport>
      </div>
    </div>

    <!-- Active Filter Chips -->
    <div v-if="selectedGameType !== null || selectedTags.length > 0" class="flex items-center gap-2 flex-wrap">
      <span class="text-xs text-gray-500">当前筛选</span>
      <!-- Game type chip -->
      <button
        v-if="selectedGameType !== null"
        @click="selectedGameType = null"
        class="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-colors"
      >
        {{ selectedGameType }}
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <!-- Tag chips -->
      <button
        v-for="tag in selectedTags"
        :key="tag"
        @click="toggleTag(tag)"
        class="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-colors"
      >
        {{ tag }}
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <!-- Clear all -->
      <button
        @click="selectedGameType = null; selectedTags.splice(0)"
        class="text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        清除全部
      </button>
    </div>
  </div>
</template>
