export const GENRES = ['VN', 'RPG', 'ACT', 'SLG', 'ADV', 'STG', 'OTHER'] as const
export type Genre = typeof GENRES[number]

export const DEV_STATUSES = ['已发布', '开发中', '停止开发'] as const
export type DevStatus = typeof DEV_STATUSES[number]

export const PLATFORMS = [
  { id: 'windows', label: 'Windows' },
  { id: 'macos', label: 'macOS' },
  { id: 'linux', label: 'Linux' },
  { id: 'android', label: 'Android' },
  { id: 'ios', label: 'iOS' },
  { id: 'web', label: 'Web' },
] as const
export type Platform = typeof PLATFORMS[number]['id']

export const COMMON_LANGUAGES = ['日语', '英语', '简体中文', '繁体中文', '韩语'] as const

export interface GameLink {
  name: string
  url: string
  type: 'acquisition' | 'related'
  icon?: string
}

export const LINK_ICONS = [
  { id: 'aifadian', label: '爱发电' },
  { id: 'apple-store', label: 'apple store' },
  { id: 'bilibili', label: 'bilibili' },
  { id: 'bluesky', label: 'bluesky' },
  { id: 'booth', label: 'booth' },
  { id: 'discord', label: 'discord' },
  { id: 'facebook', label: 'facebook' },
  { id: 'furaffinity', label: 'furaffinity' },
  { id: 'github', label: 'github' },
  { id: 'google-play', label: 'google play' },
  { id: 'itch-io', label: 'itch.io' },
  { id: 'patreon', label: 'patreon' },
  { id: 'pixiv', label: 'pixiv' },
  { id: 'QQ', label: 'QQ' },
  { id: 'steam', label: 'steam' },
  { id: 'telegram', label: 'telegram' },
  { id: 'weibo', label: '微博' },
  { id: 'x', label: 'X' },
  { id: 'xiaohongshu', label: '小红书' },
  { id: 'youtube', label: 'youtube' },
] as const

export interface GameEntry {
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
  genre: string
  dev_status: string
  platforms: string[]
  languages: string[]
  links: GameLink[]
}

export type SortField = 'rating' | 'release_date' | 'play_date'
export type SortOrder = 'asc' | 'desc'

const sortFieldLabels: Record<SortField, string> = {
  rating: '评分',
  release_date: '发行日期',
  play_date: '通关日期'
}

const searchQuery = ref('')
const selectedTags = ref<string[]>([])
const selectedGenres = ref<string[]>([])
const sortField = ref<SortField>('release_date')
const sortOrder = ref<SortOrder>('desc')
const gameList = ref<GameEntry[]>([])
const allTags = ref<{ name: string; category: string | null }[]>([])

export function useGameData() {
  const { data: gameEntries, pending } = useAsyncData<GameEntry[]>('game-entries', () => $fetch('/api/games'), { default: () => gameList.value })
  const { data: gameTags } = useAsyncData<{ name: string; category: string | null }[]>('game-tags', () => $fetch('/api/tags'), { default: () => allTags.value })

  // Immediately sync available data (covers SSR re-render and client hydration)
  if (gameEntries.value && gameEntries.value.length > 0) gameList.value = gameEntries.value
  if (gameTags.value && gameTags.value.length > 0) allTags.value = gameTags.value

  // Also watch for later updates (e.g. client-side re-fetch after browser back)
  watch(gameEntries, (v) => { if (v && v.length > 0) gameList.value = v })
  watch(gameTags, (t) => { if (t && t.length > 0) allTags.value = t })

  function toggleTag(tag: string) {
    const idx = selectedTags.value.indexOf(tag)
    if (idx === -1) {
      selectedTags.value.push(tag)
    } else {
      selectedTags.value.splice(idx, 1)
    }
  }

  function toggleGenre(genre: string) {
    const idx = selectedGenres.value.indexOf(genre)
    if (idx === -1) {
      selectedGenres.value.push(genre)
    } else {
      selectedGenres.value.splice(idx, 1)
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
    let list = [...(gameList.value || [])]

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      list = list.filter(
        v =>
          v.title.toLowerCase().includes(q) ||
          v.original_title.toLowerCase().includes(q)
      )
    }

    if (selectedGenres.value.length > 0) {
      list = list.filter(v => selectedGenres.value.includes(v.genre || 'VN'))
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

  const getGameById = (id: number): GameEntry | undefined =>
    (gameList.value || []).find(v => v.id === id)

  function refreshGameData() {
    refreshNuxtData('game-entries')
    refreshNuxtData('game-tags')
  }

  return {
    gameList,
    allTags,
    sortFieldLabels,
    searchQuery,
    selectedTags,
    selectedGenres,
    sortField,
    sortOrder,
    filteredList,
    pending,
    toggleTag,
    toggleGenre,
    setSortField,
    getGameById,
    refreshGameData
  }
}
