<script setup lang="ts">
import type { NovelEntry, NovelSortField, NovelSortOrder } from '~/composables/useNovelData'
import { NOVEL_STATUS_LABELS } from '~/composables/useNovelData'

const route = useRoute()
const seriesName = computed(() => decodeURIComponent(route.params.name as string))

const { data: novels, pending } = useAsyncData<NovelEntry[]>(
  `novel-series-${route.params.name}`,
  () => $fetch(`/api/novels?series=${encodeURIComponent(seriesName.value)}`),
)

const { data: allSeries } = useAsyncData<{ id: number; name: string; description: string; cover_url: string }[]>(
  'novel-series-list-detail',
  () => $fetch('/api/novels/series'),
)

const seriesMeta = computed(() =>
  (allSeries.value || []).find(s => s.name === seriesName.value)
)

// Sort controls
const sortField = ref<NovelSortField>('series_order')
const sortOrder = ref<NovelSortOrder>('asc')

function toggleSort(field: NovelSortField) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
}

const sortedNovels = computed(() => {
  if (!novels.value) return []
  const list = [...novels.value]
  list.sort((a, b) => {
    let cmp: number
    switch (sortField.value) {
      case 'rating':
        cmp = a.rating - b.rating
        break
      case 'read_date':
        cmp = a.read_date.localeCompare(b.read_date)
        break
      case 'word_count':
        cmp = (a.word_count || 0) - (b.word_count || 0)
        break
      case 'series_order':
        cmp = (a.series_order ?? 9999) - (b.series_order ?? 9999)
        break
    }
    return sortOrder.value === 'desc' ? -cmp : cmp
  })
  return list
})

// Aggregated tags from all novels in the series, sorted by frequency
const seriesTags = computed(() => {
  if (!novels.value?.length) return []
  const tagCount = new Map<string, number>()
  for (const n of novels.value) {
    for (const t of n.tags) {
      tagCount.set(t, (tagCount.get(t) || 0) + 1)
    }
  }
  return [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))
})

// Description expand/collapse
const showFullDesc = ref(false)
const DESC_CLAMP_THRESHOLD = 150
const descNeedsClamp = computed(() =>
  (seriesMeta.value?.description?.length || 0) > DESC_CLAMP_THRESHOLD
)

// Stats
const stats = computed(() => {
  if (!novels.value?.length) return null
  const list = novels.value
  const avgRating = list.reduce((s, n) => s + n.rating, 0) / list.length
  const totalWords = list.reduce((s, n) => s + (n.word_count || 0), 0)
  const statusCounts: Record<string, number> = {}
  for (const n of list) {
    statusCounts[n.status] = (statusCounts[n.status] || 0) + 1
  }
  return { avgRating, totalWords, count: list.length, statusCounts }
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Back -->
    <NuxtLink to="/novel/" class="text-indigo-400 hover:text-indigo-300 transition-colors text-sm">
      &larr; 返回列表
    </NuxtLink>

    <!-- Loading -->
    <div v-if="pending" class="mt-6 space-y-6">
      <div class="animate-pulse space-y-3">
        <div class="flex items-start gap-6">
          <div class="w-32 rounded-lg overflow-hidden flex-shrink-0">
            <div :style="{ aspectRatio: useCoverConfig().novelAspectRatio }" class="bg-gray-700" />
          </div>
          <div class="flex-1 space-y-2">
            <div class="h-8 bg-gray-700 rounded w-64" />
            <div class="h-4 bg-gray-700 rounded w-96" />
            <div class="h-4 bg-gray-700 rounded w-72" />
            <div class="flex gap-1.5">
              <div class="h-5 bg-gray-700 rounded-full w-16" />
              <div class="h-5 bg-gray-700 rounded-full w-12" />
              <div class="h-5 bg-gray-700 rounded-full w-14" />
            </div>
            <div class="h-3 bg-gray-700 rounded w-24" />
          </div>
        </div>
        <div class="flex gap-4">
          <div class="h-16 bg-gray-700 rounded-lg w-32" />
          <div class="h-16 bg-gray-700 rounded-lg w-32" />
          <div class="h-16 bg-gray-700 rounded-lg w-32" />
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div v-for="n in 4" :key="n" class="bg-gray-800 rounded-lg overflow-hidden border border-gray-700/50 animate-pulse">
          <div :style="{ aspectRatio: useCoverConfig().novelAspectRatio }" class="bg-gray-700" />
          <div class="p-3 space-y-2">
            <div class="h-4 bg-gray-700 rounded w-3/4" />
            <div class="h-3 bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      </div>
    </div>

    <!-- Not found / empty -->
    <div v-else-if="!novels || novels.length === 0" class="text-center py-20">
      <p class="text-gray-400 text-lg">找不到该系列</p>
      <p class="text-gray-600 text-sm mt-2">系列「{{ seriesName }}」下暂无作品</p>
    </div>

    <template v-else>
      <!-- Series Header -->
      <div class="mt-6 mb-8">
        <div class="flex flex-col sm:flex-row items-start gap-6">
          <!-- Series Cover -->
          <div v-if="seriesMeta?.cover_url" class="w-32 flex-shrink-0 rounded-lg overflow-hidden border border-gray-700">
            <img
              :src="seriesMeta.cover_url"
              :alt="seriesName"
              :style="{ aspectRatio: useCoverConfig().novelAspectRatio }"
              class="w-full object-cover"
            />
          </div>

          <div class="flex-1 min-w-0">
            <h1 class="text-2xl font-bold text-white">
              {{ seriesName }}
            </h1>

            <!-- Description with expand/collapse -->
            <div v-if="seriesMeta?.description" class="mt-2">
              <p
                :class="[showFullDesc ? '' : 'line-clamp-3', 'text-gray-300 leading-relaxed']"
              >
                {{ seriesMeta.description }}
              </p>
              <button
                v-if="descNeedsClamp"
                @click="showFullDesc = !showFullDesc"
                class="text-indigo-400 hover:text-indigo-300 text-xs mt-1 transition-colors"
              >
                {{ showFullDesc ? '收起 ▲' : '展开 ▼' }}
              </button>
            </div>

            <!-- Tags -->
            <div v-if="seriesTags.length > 0" class="flex flex-wrap gap-1.5 mt-2">
              <span
                v-for="tag in seriesTags"
                :key="tag.name"
                class="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full"
              >
                {{ tag.name }}
                <span class="text-gray-500">{{ tag.count }}</span>
              </span>
            </div>

            <p class="text-gray-500 text-sm mt-2">共 {{ stats!.count }} 部作品</p>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="flex flex-wrap gap-3 mt-4">
          <div class="bg-gray-800 border border-gray-700/50 rounded-lg px-4 py-3 min-w-[90px]">
            <p class="text-gray-500 text-xs">平均评分</p>
            <p class="text-yellow-400 text-lg font-bold">{{ stats!.avgRating.toFixed(2) }}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700/50 rounded-lg px-4 py-3 min-w-[90px]">
            <p class="text-gray-500 text-xs">总字数</p>
            <p class="text-white text-lg font-bold">{{ stats!.totalWords.toLocaleString() }}</p>
          </div>
          <div v-for="(count, status) in stats!.statusCounts" :key="status" class="bg-gray-800 border border-gray-700/50 rounded-lg px-4 py-3 min-w-[70px]">
            <p class="text-gray-500 text-xs">{{ NOVEL_STATUS_LABELS[status as keyof typeof NOVEL_STATUS_LABELS] || status }}</p>
            <p class="text-indigo-400 text-lg font-bold">{{ count }}</p>
          </div>
        </div>
      </div>

      <!-- Sort -->
      <div class="flex items-center gap-2 mb-6">
        <span class="text-xs text-gray-500 mr-1">排序</span>
        <button
          v-for="opt in ([
            { value: 'series_order' as NovelSortField, label: '系列顺序' },
            { value: 'rating' as NovelSortField, label: '评分' },
            { value: 'read_date' as NovelSortField, label: '读完日期' },
            { value: 'word_count' as NovelSortField, label: '字数' },
          ])"
          :key="opt.value"
          @click="toggleSort(opt.value)"
          class="px-3 py-1.5 text-xs rounded-lg border transition-colors"
          :class="sortField === opt.value
            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
            : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'"
        >
          {{ opt.label }}
          <span v-if="sortField === opt.value" class="ml-1">
            {{ sortOrder === 'desc' ? '↓' : '↑' }}
          </span>
        </button>
      </div>

      <!-- Novel Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <NovelCard v-for="novel in sortedNovels" :key="novel.id" :novel="novel" />
      </div>
    </template>
  </div>
</template>
