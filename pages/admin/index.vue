<script setup lang="ts">
import type { VNEntry } from '~/composables/useVNData'

definePageMeta({ middleware: ['auth'] })

const { data: entries, pending, refresh } = useAsyncData<VNEntry[]>('admin-entries', () => useRequestFetch()('/api/admin/entries'))
const { refreshVNData, allTags } = useVNData()

// Search & filter state
const searchQuery = ref('')
const selectedTags = ref<string[]>([])
const sortField = ref<'rating' | 'release_date' | 'play_date'>('release_date')
const sortOrder = ref<'asc' | 'desc'>('desc')

const sortFieldLabels: Record<string, string> = {
  rating: '评分',
  release_date: '发行日期',
  play_date: '游玩日期'
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

      <!-- Tag Groups -->
      <div class="space-y-2">
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
          class="px-2.5 py-1 text-xs rounded-full text-gray-500 hover:text-gray-300 transition-colors mt-1"
        >
          清除筛选
        </button>
      </div>
    </div>

    <!-- Result count -->
    <p class="text-gray-500 text-sm mb-4 pl-1">
      {{ filteredList.length }} / {{ (entries || []).length }} entries
    </p>

    <!-- Grid -->
    <div
      v-if="filteredList.length > 0"
      class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
    >
      <div
        v-for="entry in filteredList"
        :key="entry.id"
        class="group relative bg-gray-800 rounded-lg overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:scale-[1.02]"
      >
        <!-- Cover -->
        <div :style="{ aspectRatio: useCoverConfig().aspectRatio }" class="bg-gray-700 relative">
          <img
            :src="entry.cover_url"
            :alt="entry.title"
            class="w-full h-full object-cover"
          />
          <!-- Hover overlay -->
          <div class="absolute inset-0 bg-gray-950/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2">
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
        <!-- Info -->
        <div class="p-3 flex items-center justify-between">
          <NuxtLink
            :to="'/admin/edit/' + entry.id"
            class="text-white text-sm font-medium truncate hover:text-indigo-400 transition-colors"
          >
            {{ entry.title }}
          </NuxtLink>
          <span class="inline-flex items-center gap-0.5 bg-indigo-500/20 text-indigo-300 rounded px-1.5 py-0.5 text-xs font-semibold flex-shrink-0 ml-2">
            {{ entry.rating.toFixed(1) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!pending" class="text-center py-20">
      <p class="text-gray-500 text-lg">
        {{ (entries || []).length === 0 ? 'No entries yet.' : '没有找到匹配的条目' }}
      </p>
      <p v-if="(entries || []).length > 0" class="text-gray-600 text-sm mt-2">
        试试调整筛选条件或搜索词
      </p>
    </div>

    <!-- Loading skeleton -->
    <div v-if="pending" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <div v-for="n in 10" :key="n" class="bg-gray-800 rounded-lg overflow-hidden border border-gray-700/50 animate-pulse">
        <div :style="{ aspectRatio: useCoverConfig().aspectRatio }" class="bg-gray-700" />
        <div class="p-3 flex items-center justify-between">
          <div class="h-4 bg-gray-700 rounded w-2/3" />
          <div class="h-4 bg-gray-700 rounded w-8" />
        </div>
      </div>
    </div>
  </div>
</template>
