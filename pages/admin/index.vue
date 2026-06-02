<script setup lang="ts">
import type { VNEntry } from '~/composables/useVNData'
import { GAME_TYPES } from '~/composables/useVNData'

definePageMeta({ middleware: ['auth'] })

const { data: entries, pending, refresh } = useAsyncData<VNEntry[]>('admin-entries', () => useRequestFetch()('/api/admin/entries'))
const { refreshVNData, allTags } = useVNData()

// Search & filter state
const searchQuery = ref('')
const selectedTags = ref<string[]>([])
const selectedGameType = ref<string | null>(null)
const sortField = ref<'rating' | 'release_date' | 'play_date'>('release_date')
const sortOrder = ref<'asc' | 'desc'>('desc')

const sortFieldLabels: Record<string, string> = {
  rating: '评分',
  release_date: '发行日期',
  play_date: '通关日期'
}

// Delete confirmation state
const deletingId = ref<number | null>(null)
let deleteTimer: ReturnType<typeof setTimeout> | null = null

function toggleTag(tag: string) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx === -1) {
    selectedTags.value.push(tag)
  } else {
    selectedTags.value.splice(idx, 1)
  }
}

function setSortField(field: typeof sortField.value) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
}

// Group tags by category for filter UI
const taggedGroups = computed(() => {
  const groups: Record<string, { name: string; category: string | null }[]> = {}
  for (const tag of allTags.value) {
    const key = tag.category || '其他'
    if (!groups[key]) groups[key] = []
    groups[key].push(tag)
  }
  return Object.entries(groups).sort(([a], [b]) => {
    if (a === '其他') return 1
    if (b === '其他') return -1
    return a.localeCompare(b)
  })
})

const collapsedGroups = ref<Set<string>>(new Set())
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

const filteredList = computed(() => {
  let list = [...(entries.value || [])]

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(
      e => e.title.toLowerCase().includes(q) || e.original_title.toLowerCase().includes(q)
    )
  }

  if (selectedGameType.value) {
    list = list.filter(e => (e.game_type || 'VN') === selectedGameType.value)
  }

  if (selectedTags.value.length > 0) {
    list = list.filter(e => selectedTags.value.every(t => e.tags.includes(t)))
  }

  list.sort((a, b) => {
    let cmp: number
    switch (sortField.value) {
      case 'rating':
        cmp = a.rating - b.rating
        break
      case 'release_date':
        cmp = a.release_date.localeCompare(b.release_date)
        break
      case 'play_date':
        cmp = a.play_date.localeCompare(b.play_date)
        break
    }
    return sortOrder.value === 'desc' ? -cmp : cmp
  })

  return list
})

function requestDelete(id: number) {
  deletingId.value = id
  if (deleteTimer) clearTimeout(deleteTimer)
  deleteTimer = setTimeout(() => { deletingId.value = null }, 3000)
}

function cancelDelete() {
  deletingId.value = null
  if (deleteTimer) clearTimeout(deleteTimer)
}

async function confirmDelete(id: number) {
  await $fetch(`/api/admin/entries/${id}`, { method: 'DELETE' })
  deletingId.value = null
  if (deleteTimer) clearTimeout(deleteTimer)
  await refresh()
  await refreshVNData()
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-white border-l-4 border-indigo-500 pl-4">
        Admin Dashboard
      </h1>
      <div class="flex items-center gap-4">
        <NuxtLink
          to="/admin/categories"
          class="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors border border-gray-600"
        >
          分类 & 标签
        </NuxtLink>
        <NuxtLink
          to="/admin/edit/new"
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
        >
          + Add New Entry
        </NuxtLink>
      </div>
    </div>

    <!-- Search + Sort -->
    <div class="space-y-4 mb-6">
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
            v-for="opt in (['rating', 'release_date', 'play_date'] as const)"
            :key="opt"
            @click="setSortField(opt)"
            class="px-3 py-2 text-xs rounded-lg border transition-colors"
            :class="sortField === opt
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'"
          >
            {{ sortFieldLabels[opt] }}
            <span v-if="sortField === opt" class="ml-1">
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
                    <button
                      @click="toggleGroup(groupName)"
                      class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors py-0.5"
                    >
                      <span class="transition-transform" :class="collapsedGroups.has(groupName) ? '' : 'rotate-90'">&#9654;</span>
                      <span>{{ groupName }}</span>
                      <span v-if="selectedInGroup(tags) > 0" class="text-indigo-400">({{ selectedInGroup(tags) }})</span>
                    </button>
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
                    @click="selectedTags.length = 0"
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
          @click="selectedGameType = null; selectedTags.length = 0"
          class="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          清除全部
        </button>
      </div>
    </div>

    <!-- Result count -->
    <p class="text-gray-500 text-sm mb-4 pl-1">
      {{ filteredList.length }} / {{ (entries || []).length }} 款
    </p>

    <!-- Grid -->
    <div
      v-if="filteredList.length > 0"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      <div
        v-for="entry in filteredList"
        :key="entry.id"
        class="group relative bg-gray-800 rounded-lg overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-indigo-500/10"
      >
        <!-- Card content (same as VNCard, without link) -->
        <CoverImage :src="entry.cover_url" :alt="entry.title" :type="entry.game_type" />
        <div class="p-3 space-y-1.5">
          <h3 class="text-white font-bold text-sm truncate" :title="(entry.title?.trim() || entry.original_title?.trim() || '(无标题)') + (entry.title?.trim() && entry.original_title?.trim() ? ' / ' + entry.original_title : '')">
            {{ entry.title?.trim() || entry.original_title?.trim() || '(无标题)' }}<span v-if="entry.title?.trim() && entry.original_title?.trim()" class="text-gray-500 font-normal"> / {{ entry.original_title }}</span>
          </h3>
          <p class="text-gray-500 text-xs truncate h-4">{{ entry.developer || '' }}</p>
          <div class="flex items-center justify-between">
            <RatingDisplay :rating="entry.rating" size="sm" />
            <div class="flex items-center gap-1">
              <span v-if="entry.dev_status && entry.dev_status !== '已发布'" class="text-[11px] px-1.5 py-0.5 rounded font-bold border"
                :class="entry.dev_status === '开发中' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-stone-500/20 text-stone-300 border-stone-500/30'">
                {{ entry.dev_status }}
              </span>
              <StatusBadge :status="entry.status" />
            </div>
          </div>
          <TagList :tags="entry.tags" :max="3" />
          <p v-if="entry.review || entry.summary" class="text-gray-500 text-xs italic leading-tight line-clamp-1">
            {{ (entry.review || entry.summary).length > 50 ? (entry.review || entry.summary).slice(0, 50) + '…' : (entry.review || entry.summary) }}
          </p>
        </div>
        <!-- Hover overlay -->
        <div class="absolute inset-0 bg-gray-950/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2">
          <NuxtLink
            :to="'/admin/edit/' + entry.id"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors w-24 text-center"
          >
            编辑
          </NuxtLink>
          <button
            v-if="deletingId !== entry.id"
            @click="requestDelete(entry.id)"
            class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors w-24 text-center"
          >
            删除
          </button>
          <div v-else class="flex gap-1">
            <button
              @click="confirmDelete(entry.id)"
              class="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
            >
              确认
            </button>
            <button
              @click="cancelDelete"
              class="px-2.5 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!pending" class="text-center py-20">
      <p class="text-gray-500 text-lg">
        {{ (entries || []).length === 0 ? '暂无游戏' : '没有找到匹配的条目' }}
      </p>
      <p v-if="(entries || []).length > 0" class="text-gray-600 text-sm mt-2">
        试试调整筛选条件或搜索词
      </p>
    </div>

    <!-- Loading skeleton -->
    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div v-for="n in 8" :key="n" class="bg-gray-800 rounded-lg overflow-hidden border border-gray-700/50 animate-pulse">
        <div :style="{ aspectRatio: useCoverConfig().aspectRatio }" class="bg-gray-700" />
        <div class="p-3 space-y-2">
          <div class="h-4 bg-gray-700 rounded w-3/4" />
          <div class="flex items-center justify-between">
            <div class="h-3 bg-gray-700 rounded w-16" />
            <div class="h-4 bg-gray-700 rounded w-12" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
