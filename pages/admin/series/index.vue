<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

interface SeriesEntry {
  id: number
  name: string
  description: string
  cover_url: string
  sort_order: number
  works_count: number
}

const { data: entries, pending, refresh } = useAsyncData<SeriesEntry[]>('admin-series', () => useRequestFetch()('/api/admin/series'))

const searchQuery = ref('')

const filteredList = computed(() => {
  if (!entries.value) return []
  if (!searchQuery.value.trim()) return entries.value
  const q = searchQuery.value.trim().toLowerCase()
  return entries.value.filter(e => e.name.toLowerCase().includes(q))
})

// Delete confirmation
const deletingId = ref<number | null>(null)
let deleteTimer: ReturnType<typeof setTimeout> | null = null

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
  await $fetch(`/api/admin/series/${id}`, { method: 'DELETE' })
  deletingId.value = null
  if (deleteTimer) clearTimeout(deleteTimer)
  await refresh()
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-white border-l-4 border-indigo-500 pl-4">
        系列管理
      </h1>
      <NuxtLink
        to="/admin/series/edit/new"
        class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
      >
        + 添加系列
      </NuxtLink>
    </div>

    <!-- Search -->
    <div class="mb-6">
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索系列..."
          class="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 text-sm"
        />
      </div>
    </div>

    <!-- Result count -->
    <p class="text-gray-500 text-sm mb-4 pl-1">
      {{ filteredList.length }} / {{ (entries || []).length }} 个
    </p>

    <!-- List -->
    <div v-if="filteredList.length > 0" class="space-y-2">
      <div
        v-for="entry in filteredList"
        :key="entry.id"
        class="flex items-center gap-4 bg-gray-800 border border-gray-700/50 hover:border-gray-600/50 rounded-lg p-4 transition-colors group"
      >
        <div class="w-12 h-16 rounded overflow-hidden bg-gray-700 flex-shrink-0 border border-gray-600">
          <img
            v-if="entry.cover_url"
            :src="entry.cover_url"
            :alt="entry.name"
            :style="{ aspectRatio: useCoverConfig().novelAspectRatio }"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-xs text-gray-500">
            📚
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-white font-bold text-sm">{{ entry.name }}</h3>
          <p v-if="entry.description" class="text-gray-500 text-xs mt-0.5 truncate">{{ entry.description }}</p>
        </div>
        <span class="text-gray-500 text-xs flex-shrink-0">{{ entry.works_count }} 部</span>
        <span class="text-gray-600 text-xs flex-shrink-0">排序 {{ entry.sort_order }}</span>
        <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <NuxtLink
            :to="'/admin/series/edit/' + entry.id"
            class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors"
          >
            编辑
          </NuxtLink>
          <button
            v-if="deletingId !== entry.id"
            @click="requestDelete(entry.id)"
            class="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg transition-colors"
          >
            删除
          </button>
          <div v-else class="flex gap-1">
            <button
              @click="confirmDelete(entry.id)"
              class="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
            >
              确认
            </button>
            <button
              @click="cancelDelete"
              class="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!pending" class="text-center py-20">
      <p class="text-gray-500 text-lg">
        {{ (entries || []).length === 0 ? '暂无系列' : '没有找到匹配的系列' }}
      </p>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="space-y-2">
      <div v-for="n in 5" :key="n" class="flex items-center gap-4 bg-gray-800 border border-gray-700/50 rounded-lg p-4 animate-pulse">
        <div class="w-12 h-16 rounded bg-gray-700" />
        <div class="flex-1 space-y-1">
          <div class="h-4 bg-gray-700 rounded w-24" />
          <div class="h-3 bg-gray-700 rounded w-32" />
        </div>
      </div>
    </div>
  </div>
</template>
