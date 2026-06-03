<script setup lang="ts">
import type { NovelEntry } from '~/composables/useNovelData'

const route = useRoute()
const id = computed(() => Number(route.params.id))

const { data: author, pending, error } = useAsyncData(`novel-author-${id.value}`, () =>
  $fetch(`/api/novels/authors/${id.value}`)
)

const { data: allSeries } = useAsyncData<{ id: number; name: string; description: string; cover_url: string }[]>('novel-series-list', () => $fetch('/api/novels/series'))

const works = computed(() => (author.value as any)?.works as NovelEntry[] || [])

// Author's series — extract from works, enrich with series table metadata, aggregate tags
const authorSeries = computed(() => {
  const seriesMap = new Map<string, { count: number; avgRating: number; cover_url: string; description: string; fallbackCover: string }>()

  for (const w of works.value) {
    const name = w.series?.trim()
    if (!name) continue
    const entry = seriesMap.get(name)
    if (entry) {
      entry.count++
      entry.avgRating += w.rating
      if (!entry.fallbackCover && w.cover_url) entry.fallbackCover = w.cover_url
    } else {
      seriesMap.set(name, { count: 1, avgRating: w.rating, cover_url: '', description: '', fallbackCover: w.cover_url || '' })
    }
  }

  // Compute averages
  for (const entry of seriesMap.values()) {
    entry.avgRating = entry.count > 0 ? entry.avgRating / entry.count : 0
  }

  // Enrich with metadata from series table (cover_url takes priority over fallback)
  for (const s of (allSeries.value || [])) {
    const entry = seriesMap.get(s.name)
    if (entry) {
      if (s.cover_url) entry.cover_url = s.cover_url
      if (s.description) entry.description = s.description
    }
  }

  return [...seriesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, data]) => ({ name, ...data }))
})

// Aggregated tags per series (sorted by frequency)
const seriesTagsMap = computed(() => {
  const map = new Map<string, Map<string, number>>()
  for (const w of works.value) {
    const name = w.series?.trim()
    if (!name) continue
    if (!map.has(name)) map.set(name, new Map())
    const tagCount = map.get(name)!
    for (const t of w.tags) {
      tagCount.set(t, (tagCount.get(t) || 0) + 1)
    }
  }
  const result = new Map<string, { name: string; count: number }[]>()
  for (const [series, tc] of map) {
    result.set(series, [...tc.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })))
  }
  return result
})

// Flat, sorted: series → series_order → title
const sortedWorks = computed(() => {
  return [...works.value].sort((a, b) => {
    const sa = a.series || '￿'
    const sb = b.series || '￿'
    if (sa !== sb) return sa.localeCompare(sb)
    return (a.series_order ?? 9999) - (b.series_order ?? 9999)
  })
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Error -->
    <div v-if="error && !pending" class="text-center py-20">
      <p class="text-gray-400 text-lg mb-4">找不到该作者</p>
      <NuxtLink to="/novel/" class="text-indigo-400 hover:text-indigo-300 transition-colors">
        &larr; 返回列表
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-else-if="pending" class="space-y-8">
      <div class="flex items-start gap-6 animate-pulse">
        <div class="w-20 h-20 rounded-full bg-gray-700" />
        <div class="space-y-2 flex-1">
          <div class="h-7 bg-gray-700 rounded w-32" />
          <div class="h-4 bg-gray-700 rounded w-64" />
        </div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="n in 4" :key="n" class="bg-gray-800 rounded-lg overflow-hidden border border-gray-700/50 animate-pulse">
          <div :style="{ aspectRatio: useCoverConfig().novelAspectRatio }" class="bg-gray-700" />
          <div class="p-3 space-y-1.5">
            <div class="h-4 bg-gray-700 rounded w-3/4" />
            <div class="h-3 bg-gray-700 rounded w-1/3" />
          </div>
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

    <template v-else-if="author">
      <!-- Back link -->
      <NuxtLink to="/novel/" class="text-indigo-400 hover:text-indigo-300 transition-colors text-sm">
        &larr; 返回列表
      </NuxtLink>

      <!-- Author header -->
      <div class="flex items-start gap-6 mt-6 mb-10">
        <div class="w-20 h-20 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 border border-gray-600">
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
        <div>
          <h1 class="text-2xl font-bold text-white">{{ author.name }}</h1>
          <p v-if="author.bio" class="text-gray-300 mt-2 leading-relaxed">{{ author.bio }}</p>
        </div>
      </div>

      <!-- Links -->
      <section v-if="author.links && author.links.length > 0" class="mb-8">
        <div class="flex flex-wrap gap-2">
          <a
            v-for="(link, i) in author.links"
            :key="i"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-800 border border-gray-700/50 text-gray-200 hover:text-white hover:border-gray-600 transition-colors group"
          >
            <LinkIcon :url="link.url" :icon="link.icon" />
            <span>{{ link.name }}</span>
          </a>
        </div>
      </section>

      <!-- Series Section -->
      <section v-if="authorSeries.length > 0" class="mb-10">
        <h2 class="text-xl font-bold text-white border-l-4 border-indigo-500 pl-3 mb-4">
          收录系列 ({{ authorSeries.length }})
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <NuxtLink
            v-for="series in authorSeries"
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
              <div
                v-if="seriesTagsMap.get(series.name)?.length"
                class="flex flex-wrap gap-1 pt-0.5"
              >
                <span
                  v-for="tag in (seriesTagsMap.get(series.name) || []).slice(0, 3)"
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
      </section>

      <!-- Works Section -->
      <section v-if="works.length > 0">
        <h2 class="text-xl font-bold text-white border-l-4 border-indigo-500 pl-3 mb-6">
          收录作品 ({{ works.length }})
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <NovelCard v-for="novel in sortedWorks" :key="novel.id" :novel="novel" />
        </div>
      </section>

      <!-- No works -->
      <div v-else class="text-center py-10">
        <p class="text-gray-500">暂无收录作品</p>
      </div>
    </template>
  </div>
</template>
