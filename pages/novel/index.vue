<script setup lang="ts">
const {
  filteredNovelList,
  novelList,
  pending,
  novelSearchQuery,
  novelSelectedTags,
  novelSelectedSeries,
  novelSortField,
  novelSortOrder,
  novelAllTags,
  novelSortFieldLabels,
  allSeries,
  toggleTag,
  setSortField,
} = useNovelData()

const viewMode = ref<'works' | 'authors' | 'series'>('works')
const hasActiveFilter = computed(() =>
  filteredNovelList.value.length !== (novelList.value || []).length
)

// Series table data for enriching series view
const { data: seriesTableData } = useAsyncData<{ id: number; name: string; description: string; cover_url: string }[]>(
  'novel-series-table',
  () => $fetch('/api/novels/series'),
)

// Aggregate authors from the filtered list for "按作者" view
const aggregatedAuthors = computed(() => {
  const map = new Map<number, {
    id: number
    name: string
    avatar_url: string
    count: number
    avgRating: number
    latestReleaseDate: string
    tags: { name: string; count: number }[]
  }>()
  for (const novel of filteredNovelList.value) {
    for (const author of (novel.authors || [])) {
      if (!author.id) continue
      const entry = map.get(author.id)
      if (entry) {
        entry.count++
        entry.avgRating += novel.rating
        if (novel.release_date && (!entry.latestReleaseDate || novel.release_date > entry.latestReleaseDate)) {
          entry.latestReleaseDate = novel.release_date
        }
        for (const t of novel.tags) {
          const existing = entry.tags.find(x => x.name === t)
          if (existing) existing.count++
          else entry.tags.push({ name: t, count: 1 })
        }
      } else {
        map.set(author.id, {
          id: author.id,
          name: author.name,
          avatar_url: author.avatar_url,
          count: 1,
          avgRating: novel.rating,
          latestReleaseDate: novel.release_date || '',
          tags: novel.tags.map(t => ({ name: t, count: 1 })),
        })
      }
    }
  }
  // Compute averages and sort tags
  for (const entry of map.values()) {
    entry.avgRating = entry.count > 0 ? entry.avgRating / entry.count : 0
    entry.tags.sort((a, b) => b.count - a.count)
  }
  // Sort by name by default (will be re-sorted by sortedAggregatedAuthors)
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
})

// Aggregate series from the filtered list for "按系列" view
const aggregatedSeries = computed(() => {
  const map = new Map<string, {
    name: string
    cover_url: string
    description: string
    fallbackCover: string
    count: number
    avgRating: number
    totalWords: number
    latestReleaseDate: string
    tags: { name: string; count: number }[]
  }>()
  for (const novel of filteredNovelList.value) {
    const name = novel.series?.trim()
    if (!name) continue
    const entry = map.get(name)
    if (entry) {
      entry.count++
      entry.avgRating += novel.rating
      entry.totalWords += novel.word_count || 0
      if (novel.release_date && (!entry.latestReleaseDate || novel.release_date > entry.latestReleaseDate)) {
        entry.latestReleaseDate = novel.release_date
      }
      if (!entry.fallbackCover && novel.cover_url) entry.fallbackCover = novel.cover_url
      for (const t of novel.tags) {
        const existing = entry.tags.find(x => x.name === t)
        if (existing) existing.count++
        else entry.tags.push({ name: t, count: 1 })
      }
    } else {
      map.set(name, {
        name,
        cover_url: '',
        description: '',
        fallbackCover: novel.cover_url || '',
        count: 1,
        avgRating: novel.rating,
        totalWords: novel.word_count || 0,
        latestReleaseDate: novel.release_date || '',
        tags: novel.tags.map(t => ({ name: t, count: 1 })),
      })
    }
  }
  // Enrich from series table
  for (const s of (seriesTableData.value || [])) {
    const entry = map.get(s.name)
    if (entry) {
      if (s.cover_url) entry.cover_url = s.cover_url
      if (s.description) entry.description = s.description
    }
  }
  // Compute averages and sort tags
  for (const entry of map.values()) {
    entry.avgRating = entry.count > 0 ? entry.avgRating / entry.count : 0
    entry.tags.sort((a, b) => b.count - a.count)
  }
  // Sort series by name
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
})

// Author view sort
type AuthorSortField = 'name' | 'count' | 'avgRating' | 'latestReleaseDate'
const authorSortField = ref<AuthorSortField>('name')
const authorSortOrder = ref<'asc' | 'desc'>('asc')

function toggleAuthorSort(field: AuthorSortField) {
  if (authorSortField.value === field) {
    authorSortOrder.value = authorSortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    authorSortField.value = field
    authorSortOrder.value = field === 'name' ? 'asc' : 'desc'
  }
}

const authorSortOptions: { value: AuthorSortField; label: string }[] = [
  { value: 'name', label: '作者名' },
  { value: 'count', label: '作品数' },
  { value: 'avgRating', label: '平均评分' },
  { value: 'latestReleaseDate', label: '最新发表' },
]

const sortedAggregatedAuthors = computed(() => {
  const list = [...aggregatedAuthors.value]
  list.sort((a, b) => {
    let cmp: number
    switch (authorSortField.value) {
      case 'name':
        cmp = a.name.localeCompare(b.name)
        break
      case 'count':
        cmp = a.count - b.count
        break
      case 'avgRating':
        cmp = a.avgRating - b.avgRating
        break
      case 'latestReleaseDate':
        cmp = (a.latestReleaseDate || '').localeCompare(b.latestReleaseDate || '')
        break
    }
    return authorSortOrder.value === 'desc' ? -cmp : cmp
  })
  return list
})

// Series view sort
type SeriesSortField = 'name' | 'avgRating' | 'totalWords' | 'latestReleaseDate'
const seriesSortField = ref<SeriesSortField>('name')
const seriesSortOrder = ref<'asc' | 'desc'>('asc')

function toggleSeriesSort(field: SeriesSortField) {
  if (seriesSortField.value === field) {
    seriesSortOrder.value = seriesSortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    seriesSortField.value = field
    seriesSortOrder.value = field === 'name' ? 'asc' : 'desc'
  }
}

const seriesSortOptions: { value: SeriesSortField; label: string }[] = [
  { value: 'name', label: '系列名' },
  { value: 'avgRating', label: '平均评分' },
  { value: 'totalWords', label: '总字数' },
  { value: 'latestReleaseDate', label: '更新日期' },
]

const sortedAggregatedSeries = computed(() => {
  const list = [...aggregatedSeries.value]
  list.sort((a, b) => {
    let cmp: number
    switch (seriesSortField.value) {
      case 'name':
        cmp = a.name.localeCompare(b.name)
        break
      case 'avgRating':
        cmp = a.avgRating - b.avgRating
        break
      case 'totalWords':
        cmp = a.totalWords - b.totalWords
        break
      case 'latestReleaseDate':
        cmp = (a.latestReleaseDate || '').localeCompare(b.latestReleaseDate || '')
        break
    }
    return seriesSortOrder.value === 'desc' ? -cmp : cmp
  })
  return list
})

const sortFieldOptions: { value: typeof novelSortField.value; label: string }[] = [
  { value: 'rating', label: '评分' },
  { value: 'read_date', label: '读完日期' },
  { value: 'word_count', label: '字数' },
]

// Group tags by category
const taggedGroups = computed(() => {
  const groups: Record<string, { name: string; category: string | null }[]> = {}
  for (const tag of novelAllTags.value) {
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
  return tags.filter(t => novelSelectedTags.value.includes(t.name)).length
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-white border-l-4 border-indigo-500 pl-4">
        小说
      </h1>
      <p class="text-gray-500 text-sm mt-2 pl-5">
        <template v-if="viewMode === 'series'">
          <template v-if="hasActiveFilter">
            筛选出 {{ sortedAggregatedSeries.length }} 个系列
          </template>
          <template v-else>
            共 {{ sortedAggregatedSeries.length }} 个系列
          </template>
        </template>
        <template v-else-if="viewMode === 'authors'">
          <template v-if="hasActiveFilter">
            筛选出 {{ sortedAggregatedAuthors.length }} 位作者
          </template>
          <template v-else>
            共 {{ sortedAggregatedAuthors.length }} 位作者
          </template>
        </template>
        <template v-else-if="hasActiveFilter">
          筛选出 {{ filteredNovelList.length }} / 共 {{ (novelList || []).length }} 部小说
        </template>
        <template v-else>
          共 {{ (novelList || []).length }} 部小说
        </template>
      </p>
    </div>

    <!-- Search + Sort -->
    <div class="space-y-4 mb-6">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            v-model="novelSearchQuery"
            type="text"
            :placeholder="viewMode === 'authors' ? '搜索作者...' : viewMode === 'series' ? '搜索系列...' : '搜索标题...'"
            class="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-sm transition-colors"
          />
        </div>
        <div v-if="viewMode === 'works'" class="flex gap-1">
          <button
            v-for="opt in sortFieldOptions"
            :key="opt.value"
            @click="setSortField(opt.value)"
            class="px-3 py-2 text-xs rounded-lg border transition-colors"
            :class="novelSortField === opt.value
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'"
          >
            {{ opt.label }}
            <span v-if="novelSortField === opt.value" class="ml-1">
              {{ novelSortOrder === 'desc' ? '&#8595;' : '&#8593;' }}
            </span>
          </button>
        </div>
        <div v-else-if="viewMode === 'authors'" class="flex gap-1">
          <button
            v-for="opt in authorSortOptions"
            :key="opt.value"
            @click="toggleAuthorSort(opt.value)"
            class="px-3 py-2 text-xs rounded-lg border transition-colors"
            :class="authorSortField === opt.value
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'"
          >
            {{ opt.label }}
            <span v-if="authorSortField === opt.value" class="ml-1">
              {{ authorSortOrder === 'desc' ? '&#8595;' : '&#8593;' }}
            </span>
          </button>
        </div>
        <div v-else-if="viewMode === 'series'" class="flex gap-1">
          <button
            v-for="opt in seriesSortOptions"
            :key="opt.value"
            @click="toggleSeriesSort(opt.value)"
            class="px-3 py-2 text-xs rounded-lg border transition-colors"
            :class="seriesSortField === opt.value
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'"
          >
            {{ opt.label }}
            <span v-if="seriesSortField === opt.value" class="ml-1">
              {{ seriesSortOrder === 'desc' ? '&#8595;' : '&#8593;' }}
            </span>
          </button>
        </div>
      </div>

      <!-- View Toggle + Tag Filter -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <button
            @click="viewMode = 'works'"
            class="px-3 py-1.5 text-xs rounded-full border transition-colors"
            :class="viewMode === 'works'
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'"
          >
            按作品
          </button>
          <button
            @click="viewMode = 'authors'"
            class="px-3 py-1.5 text-xs rounded-full border transition-colors"
            :class="viewMode === 'authors'
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'"
          >
            按作者
          </button>
          <button
            @click="viewMode = 'series'"
            class="px-3 py-1.5 text-xs rounded-full border transition-colors"
            :class="viewMode === 'series'
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'"
          >
            按系列
          </button>
        </div>
        <div class="relative">
          <button
            @click="showFilterPopup = !showFilterPopup"
            class="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors flex-shrink-0"
            :class="showFilterPopup || novelSelectedTags.length > 0
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>过滤器</span>
            <span v-if="novelSelectedTags.length > 0" class="text-indigo-400">({{ novelSelectedTags.length }})</span>
          </button>

          <Teleport to="body">
            <div v-if="showFilterPopup" class="fixed inset-0 z-50" @click.self="showFilterPopup = false">
              <div
                class="absolute left-4 right-4 top-20 sm:left-auto sm:right-6 sm:top-24 sm:w-72 max-h-[60vh] bg-gray-900 border border-gray-600 rounded-xl shadow-2xl shadow-black/70 overflow-hidden flex flex-col"
                @click.stop
              >
                <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                  <span class="text-sm font-semibold text-gray-200">过滤器</span>
                  <button @click="showFilterPopup = false" class="text-gray-500 hover:text-gray-300 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div class="overflow-y-auto px-4 py-3 space-y-2">
                  <div v-for="[groupName, tags] in taggedGroups" :key="groupName">
                    <button @click="toggleGroup(groupName)" class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors py-0.5">
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
                        :class="novelSelectedTags.includes(tag.name)
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                          : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'"
                      >
                        {{ tag.name }}
                      </button>
                    </div>
                  </div>
                  <button
                    v-if="novelSelectedTags.length > 0"
                    @click="novelSelectedTags.splice(0)"
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
      <div v-if="novelSelectedTags.length > 0" class="flex items-center gap-2 flex-wrap">
        <span class="text-xs text-gray-500">当前筛选</span>
        <button
          v-for="tag in novelSelectedTags"
          :key="tag"
          @click="toggleTag(tag)"
          class="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-colors"
        >
          {{ tag }}
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <button
          @click="novelSelectedTags.splice(0)"
          class="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          清除全部
        </button>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="pending" class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div v-for="n in 8" :key="n" class="bg-gray-800 rounded-lg overflow-hidden border border-gray-700/50 animate-pulse">
        <div :style="{ aspectRatio: useCoverConfig().novelAspectRatio }" class="bg-gray-700" />
        <div class="p-3 space-y-2">
          <div class="h-4 bg-gray-700 rounded w-3/4" />
          <div class="flex items-center justify-between">
            <div class="h-3 bg-gray-700 rounded w-16" />
            <div class="h-4 bg-gray-700 rounded w-12" />
          </div>
        </div>
      </div>
    </div>

    <!-- Novel Grid -->
    <div
      v-if="viewMode === 'works' && filteredNovelList.length > 0"
      class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      <NovelCard v-for="novel in filteredNovelList" :key="novel.id" :novel="novel" />
    </div>

    <!-- Author Grid -->
    <div
      v-if="viewMode === 'authors' && sortedAggregatedAuthors.length > 0"
      class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      <NuxtLink
        v-for="author in sortedAggregatedAuthors"
        :key="author.id"
        :to="'/novel/author/' + author.id"
        class="group block bg-gray-800 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-indigo-500/10 p-5"
      >
        <div class="flex items-center gap-4 mb-3">
          <div class="w-14 h-14 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 border border-gray-600">
            <img
              v-if="author.avatar_url"
              :src="author.avatar_url"
              :alt="author.name"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-2xl text-gray-500">
              👤
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-white font-bold text-sm group-hover:text-indigo-300 transition-colors truncate">
              {{ author.name }}
            </h3>
            <p class="text-gray-500 text-xs">
              {{ author.count }} 部作品<span v-if="author.count > 0"> · <svg class="w-3.5 h-3.5 inline-block align-[-1px]" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" fill="#f59e0b"/></svg> <span class="text-amber-400">{{ author.avgRating.toFixed(1) }}</span></span>
            </p>
          </div>
        </div>
        <div v-if="author.tags.length > 0" class="flex flex-wrap gap-1">
          <span
            v-for="tag in author.tags.slice(0, 3)"
            :key="tag.name"
            class="px-2 py-0.5 text-[11px] rounded-full bg-gray-700/50 text-gray-400 border border-gray-700/50"
          >
            {{ tag.name }}
            <span class="text-gray-600">{{ tag.count }}</span>
          </span>
        </div>
      </NuxtLink>
    </div>

    <!-- Series Grid -->
    <div
      v-if="viewMode === 'series' && sortedAggregatedSeries.length > 0"
      class="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      <NuxtLink
        v-for="series in sortedAggregatedSeries"
        :key="series.name"
        :to="'/novel/series/' + encodeURIComponent(series.name)"
        class="group block bg-gray-800 rounded-lg overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-indigo-500/10"
      >
        <div :style="{ aspectRatio: useCoverConfig().novelAspectRatio }" class="bg-gray-700 overflow-hidden">
          <img
            v-if="series.cover_url || series.fallbackCover"
            :src="series.cover_url || series.fallbackCover"
            :alt="series.name"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-3xl text-gray-500">
            📚
          </div>
        </div>
        <div class="p-3 space-y-1">
          <h3 class="text-white font-bold text-sm group-hover:text-indigo-300 transition-colors truncate">
            {{ series.name }}
          </h3>
          <p v-if="series.description" class="text-gray-500 text-xs leading-tight line-clamp-2">
            {{ series.description }}
          </p>
          <!-- Tags -->
          <div v-if="series.tags.length > 0" class="flex flex-wrap gap-1 pt-0.5">
            <span
              v-for="tag in series.tags.slice(0, 3)"
              :key="tag.name"
              class="bg-gray-700 text-gray-400 text-xs px-1.5 py-0.5 rounded-full"
            >
              {{ tag.name }}
              <span class="text-gray-600">{{ tag.count }}</span>
            </span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-gray-600">{{ series.count }} 部作品</span>
            <span class="inline-flex items-center gap-0.5 text-amber-400">
              <svg class="w-3.5 h-3.5" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" fill="#f59e0b"/></svg>
              {{ series.avgRating.toFixed(1) }}
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Empty -->
    <div v-if="!pending && ((viewMode === 'works' && filteredNovelList.length === 0) || (viewMode === 'authors' && sortedAggregatedAuthors.length === 0) || (viewMode === 'series' && sortedAggregatedSeries.length === 0))" class="text-center py-20">
      <p class="text-gray-500 text-lg">没有找到匹配的{{ viewMode === 'authors' ? '作者' : viewMode === 'series' ? '系列' : '作品' }}</p>
      <p class="text-gray-600 text-sm mt-2">试试调整筛选条件或搜索词</p>
    </div>
  </div>
</template>
