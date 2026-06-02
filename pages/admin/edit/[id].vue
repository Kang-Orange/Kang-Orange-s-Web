<script setup lang="ts">
import type { VNEntry } from '~/composables/useVNData'
import { GAME_TYPES, DEV_STATUSES, PLATFORMS, COMMON_LANGUAGES, LINK_ICONS } from '~/composables/useVNData'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const { refreshVNData } = useVNData()

const isNew = computed(() => route.params.id === 'new')
const id = computed(() => isNew.value ? null : Number(route.params.id))

const loading = ref(!isNew.value)
const saving = ref(false)
const uploading = ref(false)
const pendingCoverFile = ref<File | null>(null)
const coverPreviewUrl = ref<string | null>(null)
const originalCoverUrl = ref<string | null>(null)
const coverInputKey = ref(0)
const showCropper = ref(false)
const cropSource = ref<string | null>(null)
const { $supabase } = useNuxtApp()

function onCoverFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (cropSource.value) {
    URL.revokeObjectURL(cropSource.value)
  }
  cropSource.value = URL.createObjectURL(file)
  showCropper.value = true
}

function onCropConfirm(blob: Blob) {
  if (coverPreviewUrl.value) {
    URL.revokeObjectURL(coverPreviewUrl.value)
  }
  const file = new File([blob], 'cover.jpg', { type: 'image/jpeg' })
  pendingCoverFile.value = file
  coverPreviewUrl.value = URL.createObjectURL(blob)
  showCropper.value = false
}

function onCropCancel() {
  showCropper.value = false
  if (cropSource.value) {
    URL.revokeObjectURL(cropSource.value)
    cropSource.value = null
  }
  coverInputKey.value++
}

function clearPendingCover() {
  if (coverPreviewUrl.value) {
    URL.revokeObjectURL(coverPreviewUrl.value)
  }
  pendingCoverFile.value = null
  coverPreviewUrl.value = null
  coverInputKey.value++
}

function getStoragePath(url: string): string | null {
  const match = url.match(/\/storage\/v1\/object\/public\/covers\/(.+)/)
  return match ? match[1] : null
}

async function uploadToStorage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await $supabase.storage.from('covers').upload(path, file, {
    cacheControl: '31536000',
    upsert: false
  })
  if (error) throw new Error('Upload failed: ' + error.message)
  const { data: urlData } = $supabase.storage.from('covers').getPublicUrl(path)
  return urlData.publicUrl
}

// Form
const form = ref({
  title: '',
  original_title: '',
  summary: '',
  cover_url: '',
  rating: 8,
  status: 'completed' as VNEntry['status'],
  review: '',
  play_time: '',
  play_date: '',
  developer: '',
  release_date: '',
  game_type: 'VN',
  dev_status: '已发布',
})

// Tags
const { data: allTags } = useAsyncData<{ id: number; name: string; category_id: number | null }[]>('admin-tags', () => useRequestFetch()('/api/admin/tags'))
const { data: categories } = useAsyncData<{ id: number; name: string }[]>('admin-categories-edit', () => useRequestFetch()('/api/admin/categories'))
const selectedTags = ref<string[]>([])
const newTagName = ref('')
const newTagCategory = ref<number | null>(null)

// Platforms
const selectedPlatforms = ref<string[]>([])
function togglePlatform(id: string) {
  const idx = selectedPlatforms.value.indexOf(id)
  if (idx === -1) selectedPlatforms.value.push(id)
  else selectedPlatforms.value.splice(idx, 1)
}

// Languages
const selectedLanguages = ref<string[]>([])
const newLanguage = ref('')
function toggleLanguage(lang: string) {
  const idx = selectedLanguages.value.indexOf(lang)
  if (idx === -1) selectedLanguages.value.push(lang)
  else selectedLanguages.value.splice(idx, 1)
}
function addLanguage() {
  const name = newLanguage.value.trim()
  if (name && !selectedLanguages.value.includes(name)) {
    selectedLanguages.value.push(name)
  }
  newLanguage.value = ''
}

// Links
const linkList = ref<{ name: string; url: string; type: 'acquisition' | 'related'; icon?: string }[]>([])
function addLink() {
  linkList.value.push({ name: '', url: '', type: 'acquisition', icon: undefined })
}
function removeLink(index: number) {
  linkList.value.splice(index, 1)
}

// Group tags by category_id for display
const taggedGroups = computed(() => {
  const catMap = new Map<number | null, string>()
  ;(categories.value || []).forEach(c => catMap.set(c.id, c.name))

  const groups: Record<string, { name: string }[]> = {}
  for (const tag of (allTags.value || [])) {
    const catName = tag.category_id ? catMap.get(tag.category_id) || '未分类' : '未分类'
    if (!groups[catName]) groups[catName] = []
    groups[catName].push(tag)
  }
  return Object.entries(groups).sort(([a], [b]) => {
    if (a === '未分类') return 1
    if (b === '未分类') return -1
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

function toggleTag(name: string) {
  const idx = selectedTags.value.indexOf(name)
  if (idx === -1) {
    selectedTags.value.push(name)
  } else {
    selectedTags.value.splice(idx, 1)
  }
}

async function addTag() {
  const name = newTagName.value.trim()
  if (!name || selectedTags.value.includes(name)) {
    newTagName.value = ''
    return
  }
  const body: Record<string, any> = { name }
  if (newTagCategory.value) body.category_id = newTagCategory.value

  const created = await $fetch('/api/admin/tags', { method: 'POST', body })
  selectedTags.value.push(created.name)
  // Refresh tag list
  allTags.value?.push(created)
  newTagName.value = ''
  newTagCategory.value = null
}

// Load existing entry
if (!isNew.value) {
  const { data } = useAsyncData<VNEntry>('admin-edit-entry', () => useRequestFetch()('/api/admin/entries'))
  watch(data, (entry) => {
    if (!entry) return
    // Find the target entry from the list
    const found = Array.isArray(entry) ? entry.find((e: any) => e.id === id.value) : null
    if (found) {
      form.value = {
        title: found.title,
        original_title: found.original_title,
        summary: found.summary,
        cover_url: found.cover_url,
        rating: found.rating,
        status: found.status,
        review: found.review,
        play_time: found.play_time,
        play_date: found.play_date,
        developer: found.developer,
        release_date: found.release_date,
        game_type: found.game_type || 'VN',
        dev_status: found.dev_status || '已发布',
      }
      selectedTags.value = [...found.tags]
      selectedPlatforms.value = [...(found.platforms || [])]
      selectedLanguages.value = [...(found.languages || [])]
      linkList.value = (found.links || []).map((l: any) => ({ ...l }))
      originalCoverUrl.value = found.cover_url || null
    }
    loading.value = false
  })
} else {
  loading.value = false
}

async function save() {
  saving.value = true

  try {
    // Upload cover to Storage first (if a new file was selected)
    if (pendingCoverFile.value) {
      uploading.value = true
      const newUrl = await uploadToStorage(pendingCoverFile.value)
      form.value.cover_url = newUrl
      uploading.value = false
    }

    const payload = {
      ...form.value,
      tags: selectedTags.value,
      platforms: selectedPlatforms.value,
      languages: selectedLanguages.value,
      links: linkList.value,
    }

    if (isNew.value) {
      await $fetch('/api/admin/entries', { method: 'POST', body: payload })
    } else {
      await $fetch(`/api/admin/entries/${id.value}`, { method: 'PUT', body: payload })
    }

    // Clean up old cover from Storage if replaced
    if (originalCoverUrl.value && originalCoverUrl.value !== form.value.cover_url) {
      const oldPath = getStoragePath(originalCoverUrl.value)
      if (oldPath) {
        await $supabase.storage.from('covers').remove([oldPath])
      }
    }

    await refreshVNData()
    await router.push('/admin')
  } catch (e: any) {
    alert(e.message || 'Save failed')
    saving.value = false
    uploading.value = false
  }
}

function cancelEdit() {
  if (coverPreviewUrl.value) {
    URL.revokeObjectURL(coverPreviewUrl.value)
  }
  router.push('/admin')
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <NuxtLink to="/admin" class="text-indigo-400 hover:text-indigo-300 transition-colors text-sm">
      &larr; 返回管理
    </NuxtLink>

    <h1 class="text-2xl font-bold text-white border-l-4 border-indigo-500 pl-4 mt-4 mb-8">
      {{ isNew ? '新建' : '编辑' }}
    </h1>

    <div v-if="loading" class="text-center py-20 text-gray-500">加载中...</div>

    <form v-else @submit.prevent="save" class="space-y-6">
      <!-- Title -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-gray-400 text-sm mb-1">译名 <span class="text-gray-600">(选填)</span></label>
          <input
            v-model="form.title"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-1">原名</label>
          <input
            v-model="form.original_title"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
      </div>

      <!-- Cover Image -->
      <div>
        <label class="block text-gray-400 text-sm mb-1">封面图片</label>

        <!-- Upload -->
        <div class="flex items-center gap-2 mb-2">
          <label class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors cursor-pointer">
            {{ pendingCoverFile ? '更换图片' : '选择图片' }}
            <input type="file" accept="image/*" class="hidden" :key="coverInputKey" @change="onCoverFileChange" :disabled="saving" />
          </label>
          <button
            v-if="pendingCoverFile"
            type="button"
            @click="clearPendingCover"
            class="text-xs text-red-400 hover:text-red-300"
          >
            清除
          </button>
          <span v-else class="text-xs text-gray-500">或粘贴链接</span>
        </div>

        <!-- URL input -->
        <input
          v-model="form.cover_url"
          type="url"
          placeholder="https://..."
          class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 text-sm"
        />

        <!-- Preview -->
        <div v-if="coverPreviewUrl || form.cover_url" class="mt-2 w-48">
          <img
            :src="coverPreviewUrl || form.cover_url"
            alt="Cover preview"
            :style="{ aspectRatio: useCoverConfig().aspectRatio }" class="w-full object-cover rounded border border-gray-700"
            @error="($event.target as HTMLImageElement).style.display = 'none'"
          />
        </div>
      </div>

      <!-- Game Type + Dev Status + Rating + Status -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="block text-gray-400 text-sm mb-1">游戏类型</label>
          <select
            v-model="form.game_type"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          >
            <option v-for="gt in GAME_TYPES" :key="gt" :value="gt">{{ gt }}</option>
          </select>
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-1">开发状态</label>
          <select
            v-model="form.dev_status"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          >
            <option v-for="ds in DEV_STATUSES" :key="ds" :value="ds">{{ ds }}</option>
          </select>
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-1">评分</label>
          <input
            v-model.number="form.rating"
            type="number"
            min="0"
            max="10"
            step="0.5"
            required
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-1">状态</label>
          <select
            v-model="form.status"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          >
            <option value="completed">已完成</option>
            <option value="playing">游玩中</option>
            <option value="plan_to_play">计划中</option>
            <option value="dropped">已弃坑</option>
          </select>
        </div>
      </div>

      <!-- Developer + Play Time + Play Date + Release Date -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="block text-gray-400 text-sm mb-1">开发商</label>
          <input
            v-model="form.developer"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-1">游玩时长</label>
          <input
            v-model="form.play_time"
            placeholder="例：30 小时"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-1">通关日期</label>
          <input
            v-model="form.play_date"
            type="date"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-1">发售日</label>
          <input
            v-model="form.release_date"
            type="date"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
      </div>

      <!-- Platforms -->
      <div>
        <label class="block text-gray-400 text-sm mb-1">平台</label>
        <div class="flex flex-wrap gap-2">
          <label v-for="p in PLATFORMS" :key="p.id" class="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              :checked="selectedPlatforms.includes(p.id)"
              @change="togglePlatform(p.id)"
              class="w-3.5 h-3.5 rounded bg-gray-800 border-gray-600 text-indigo-500 focus:ring-0 focus:ring-offset-0"
            />
            <span class="text-sm text-gray-300">{{ p.label }}</span>
          </label>
        </div>
      </div>

      <!-- Languages -->
      <div>
        <label class="block text-gray-400 text-sm mb-1">语言</label>
        <div class="flex flex-wrap gap-2 mb-2">
          <button
            v-for="lang in COMMON_LANGUAGES"
            :key="lang"
            type="button"
            @click="toggleLanguage(lang)"
            class="px-2.5 py-1 text-xs rounded-full border transition-colors"
            :class="selectedLanguages.includes(lang)
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'"
          >
            {{ lang }}
          </button>
        </div>
        <div class="flex gap-2">
          <input
            v-model="newLanguage"
            type="text"
            placeholder="其他语言..."
            class="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
            @keyup.enter.prevent="addLanguage"
          />
          <button
            type="button"
            @click="addLanguage"
            class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
          >
            添加
          </button>
        </div>
        <!-- Custom added languages as chips -->
        <div v-if="selectedLanguages.length > 0" class="flex flex-wrap gap-1.5 mt-2">
          <span
            v-for="lang in selectedLanguages"
            :key="lang"
            class="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
          >
            {{ lang }}
            <button type="button" @click="toggleLanguage(lang)" class="text-indigo-400 hover:text-indigo-200">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </span>
        </div>
      </div>

      <!-- Summary -->
      <div>
        <label class="block text-gray-400 text-sm mb-1">简介</label>
        <textarea
          v-model="form.summary"
          rows="4"
          class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm resize-y"
        />
      </div>

      <!-- Review -->
      <div>
        <label class="block text-gray-400 text-sm mb-1">评测</label>
        <textarea
          v-model="form.review"
          rows="6"
          class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm resize-y"
        />
      </div>

      <!-- Tags -->
      <div>
        <label class="block text-gray-400 text-sm mb-2">标签</label>

        <!-- Grouped tag selection -->
        <div class="space-y-2 mb-3">
          <div v-for="[groupName, tags] in taggedGroups" :key="groupName">
            <button
              type="button"
              @click="toggleGroup(groupName)"
              class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors py-0.5"
            >
              <span class="transition-transform" :class="collapsedGroups.has(groupName) ? '' : 'rotate-90'">&#9654;</span>
              <span>{{ groupName }}</span>
            </button>
            <div v-if="!collapsedGroups.has(groupName)" class="flex flex-wrap gap-1.5 mt-1">
              <button
                v-for="tag in tags"
                :key="tag.name"
                type="button"
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
        </div>

        <!-- New tag input -->
        <div class="flex gap-2">
          <input
            v-model="newTagName"
            type="text"
            placeholder="新标签名..."
            class="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
            @keyup.enter.prevent="addTag"
          />
          <select
            v-model="newTagCategory"
            class="w-32 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-sm focus:outline-none focus:border-indigo-500/50"
          >
            <option :value="null">(无分类)</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
          <button
            type="button"
            @click="addTag"
            class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
          >
            添加
          </button>
        </div>
      </div>

      <!-- Links -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-gray-400 text-sm">链接</label>
          <button
            type="button"
            @click="addLink"
            class="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors"
          >
            + 添加链接
          </button>
        </div>
        <div v-if="linkList.length === 0" class="text-gray-600 text-xs">暂无链接</div>
        <div v-else class="space-y-3">
          <div v-for="(link, i) in linkList" :key="i" class="flex items-start gap-2">
            <div class="flex-1 space-y-2">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  v-model="link.name"
                  type="text"
                  placeholder="名称"
                  class="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
                />
                <input
                  v-model="link.url"
                  type="url"
                  placeholder="https://..."
                  class="w-full sm:col-span-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 text-sm"
                />
              </div>
              <div class="flex items-center gap-2">
                <select
                  v-model="link.icon"
                  class="px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-xs focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="">无图标</option>
                  <option v-for="ico in LINK_ICONS" :key="ico.id" :value="ico.id">{{ ico.label }}</option>
                </select>
                <select
                  v-model="link.type"
                  class="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-xs focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="acquisition">获取途径</option>
                  <option value="related">相关链接</option>
                </select>
                <button
                  type="button"
                  @click="removeLink(i)"
                  class="text-red-400 hover:text-red-300 text-xs flex-shrink-0"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit -->
      <div class="flex gap-3 pt-4 border-t border-gray-800">
        <button
          type="submit"
          :disabled="saving"
          class="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
        >
          {{ saving ? '保存中...' : (isNew ? '创建' : '保存') }}
        </button>
        <button
          type="button"
          @click="cancelEdit"
          class="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
        >
          取消
        </button>
      </div>
    </form>

    <CropModal
      v-if="showCropper && cropSource"
      :src="cropSource"
      @crop="onCropConfirm"
      @cancel="onCropCancel"
    />
  </div>
</template>
