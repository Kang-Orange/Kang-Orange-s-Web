export interface VNEntry {
  id: number
  title: string
  original_title: string
  summary: string
  cover_url: string
  rating: number
  status: 'completed' | 'playing' | 'plan_to_play' | 'dropped'
  review: string
  play_time: string
  play_date: string
  tags: string[]
  developer: string
  release_date: string
}

export type SortField = 'rating' | 'release_date' | 'play_date'
export type SortOrder = 'asc' | 'desc'

const sortFieldLabels: Record<SortField, string> = {
  rating: '评分',
  release_date: 'VN 发行日期',
  play_date: '游玩日期'
}

const searchQuery = ref('')
const selectedTags = ref<string[]>([])
const sortField = ref<SortField>('release_date')
const sortOrder = ref<SortOrder>('desc')

export function useVNData() {
  const { data: vnList } = useAsyncData<VNEntry[]>('vn-entries', () => $fetch('/api/entries'), { default: () => [] })
  const { data: allTags } = useAsyncData<string[]>('vn-tags', () => $fetch('/api/tags'), { default: () => [] })

  function toggleTag(tag: string) {
    const idx = selectedTags.value.indexOf(tag)
    if (idx === -1) {
      selectedTags.value.push(tag)
    } else {
      selectedTags.value.splice(idx, 1)
    }
  }

  function setSortField(field: SortField) {
    if (sortField.value === field) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortField.value = field
      sortOrder.value = 'desc'
    }
  }

  const filteredList = computed(() => {
    let list = [...(vnList.value || [])]

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      list = list.filter(
        v =>
          v.title.toLowerCase().includes(q) ||
          v.original_title.toLowerCase().includes(q)
      )
    }

    if (selectedTags.value.length > 0) {
      list = list.filter(v =>
        selectedTags.value.every(tag => v.tags.includes(tag))
      )
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

  const getVNById = (id: number): VNEntry | undefined =>
    (vnList.value || []).find(v => v.id === id)

  return {
    vnList,
    allTags,
    sortFieldLabels,
    searchQuery,
    selectedTags,
    sortField,
    sortOrder,
    filteredList,
    toggleTag,
    setSortField,
    getVNById
  }
}
