export interface NovelLink {
  name: string
  url: string
  type: 'reading'
  icon?: string
}

export interface NovelAuthor {
  id: number
  name: string
  avatar_url: string
  role: string
}

export interface NovelEntry {
  id: number
  title: string
  original_title: string
  summary: string
  cover_url: string
  rating: number
  status: 'completed' | 'reading' | 'plan_to_read' | 'dropped'
  review: string
  read_time: string
  read_date: string
  release_date: string
  word_count: number | null
  publisher: string
  series: string
  series_order: number | null
  tags: string[]
  authors: NovelAuthor[]
  links: NovelLink[]
}

export type NovelSortField = 'rating' | 'read_date' | 'word_count' | 'series_order' | 'release_date'
export type NovelSortOrder = 'asc' | 'desc'

export const NOVEL_STATUS_LABELS: Record<NovelEntry['status'], string> = {
  completed: '已读完',
  reading: '阅读中',
  plan_to_read: '想读',
  dropped: '已弃坑',
}

const novelSortFieldLabels: Record<NovelSortField, string> = {
  rating: '评分',
  read_date: '读完日期',
  word_count: '字数',
  series_order: '系列顺序',
  release_date: '发表时间',
}

const novelSearchQuery = ref('')
const novelSelectedTags = ref<string[]>([])
const novelSelectedSeries = ref<string | null>(null)
const novelSortField = ref<NovelSortField>('read_date')
const novelSortOrder = ref<NovelSortOrder>('desc')
const novelList = ref<NovelEntry[]>([])
const novelAllTags = ref<{ name: string; category: string | null }[]>([])

export function useNovelData() {
  const { data: novelEntries, pending } = useAsyncData<NovelEntry[]>('novel-entries', () => $fetch('/api/novels'), { default: () => novelList.value })
  const { data: novelTags } = useAsyncData<{ name: string; category: string | null }[]>('novel-tags', () => $fetch('/api/tags'), { default: () => novelAllTags.value })

  if (novelEntries.value && novelEntries.value.length > 0) novelList.value = novelEntries.value
  if (novelTags.value && novelTags.value.length > 0) novelAllTags.value = novelTags.value

  watch(novelEntries, (v) => { if (v && v.length > 0) novelList.value = v })
  watch(novelTags, (t) => { if (t && t.length > 0) novelAllTags.value = t })

  function toggleTag(tag: string) {
    const idx = novelSelectedTags.value.indexOf(tag)
    if (idx === -1) {
      novelSelectedTags.value.push(tag)
    } else {
      novelSelectedTags.value.splice(idx, 1)
    }
  }

  function setSortField(field: NovelSortField) {
    if (novelSortField.value === field) {
      novelSortOrder.value = novelSortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      novelSortField.value = field
      novelSortOrder.value = 'desc'
    }
  }

  // All unique series names from the novel list
  const allSeries = computed(() => {
    const set = new Set<string>()
    for (const n of novelList.value) {
      if (n.series) set.add(n.series)
    }
    return [...set].sort()
  })

  const filteredNovelList = computed(() => {
    let list = [...(novelList.value || [])]

    if (novelSearchQuery.value.trim()) {
      const q = novelSearchQuery.value.trim().toLowerCase()
      list = list.filter(
        v => v.title.toLowerCase().includes(q) || v.original_title.toLowerCase().includes(q)
      )
    }

    if (novelSelectedTags.value.length > 0) {
      list = list.filter(v => novelSelectedTags.value.every(tag => v.tags.includes(tag)))
    }

    if (novelSelectedSeries.value) {
      list = list.filter(v => v.series === novelSelectedSeries.value)
    }

    list.sort((a, b) => {
      let cmp: number
      switch (novelSortField.value) {
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
        case 'release_date':
          cmp = (a.release_date || '').localeCompare(b.release_date || '')
          break
      }
      return novelSortOrder.value === 'desc' ? -cmp : cmp
    })

    return list
  })

  const getNovelById = (id: number): NovelEntry | undefined =>
    (novelList.value || []).find(v => v.id === id)

  function refreshNovelData() {
    refreshNuxtData('novel-entries')
    refreshNuxtData('novel-tags')
  }

  return {
    novelList,
    novelAllTags,
    novelSortFieldLabels,
    novelSearchQuery,
    novelSelectedTags,
    novelSelectedSeries,
    novelSortField,
    novelSortOrder,
    allSeries,
    filteredNovelList,
    pending,
    toggleTag,
    setSortField,
    getNovelById,
    refreshNovelData,
  }
}
