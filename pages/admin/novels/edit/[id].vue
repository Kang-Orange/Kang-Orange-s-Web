<script setup lang="ts">
import type { NovelEntry } from '~/composables/useNovelData'
import { LINK_ICONS } from '~/composables/useGameData'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const { refreshNovelData } = useNovelData()

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
  if (cropSource.value) URL.revokeObjectURL(cropSource.value)
  cropSource.value = URL.createObjectURL(file)
  showCropper.value = true
}

function onCropConfirm(blob: Blob) {
  if (coverPreviewUrl.value) URL.revokeObjectURL(coverPreviewUrl.value)
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
  if (coverPreviewUrl.value) URL.revokeObjectURL(coverPreviewUrl.value)
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
  status: 'plan_to_read' as NovelEntry['status'],
  review: '',
  read_time: '',
  read_date: '',
  release_date: '',
  word_count: null as number | null,
  publisher: '',
  series: '',
  series_order: null as number | null,
})

// Tags
const { data: allTags } = useAsyncData<{ id: number; name: string; category_id: number | null }[]>('admin-novel-tags', () => useRequestFetch()('/api/admin/tags'))
const { data: categories } = useAsyncData<{ id: number; name: string }[]>('admin-novel-categories', () => useRequestFetch()('/api/admin/categories'))
const { data: seriesOptions } = useAsyncData<{ id: number; name: string }[]>('admin-novel-series-options', () => useRequestFetch()('/api/admin/series'))
const selectedTags = ref<string[]>([])
const newTagName = ref('')
const newTagCategory = ref<number | null>(null)

// Authors
interface AuthorEntry {
  name: string
  role: string
  id?: number
}
const authorList = ref<AuthorEntry[]>([])

function addAuthor() {
  authorList.value.push({ name: '', role: 'writer' })
}

function removeAuthor(index: number) {
  authorList.value.splice(index, 1)
}

// Links
const linkList = ref<{ name: string; url: string; type: 'reading'; icon?: string }[]>([])

function addLink() {
  linkList.value.push({ name: '', url: '', type: 'reading', icon: undefined })
}

function removeLink(index: number) {
  linkList.value.splice(index, 1)
}

// Group tags by category
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
  allTags.value?.push(created)
  newTagName.value = ''
  newTagCategory.value = null
}

// Load existing entry
if (!isNew.value) {
  const { data } = useAsyncData<NovelEntry[]>('admin-edit-novel', () => useRequestFetch()('/api/admin/novels'))
  watch(data, (entries) => {
    if (!entries) return
    const found = Array.isArray(entries) ? entries.find((e: any) => e.id === id.value) : null
    if (found) {
      form.value = {
        title: found.title,
        original_title: found.original_title,
        summary: found.summary,
        cover_url: found.cover_url,
        rating: found.rating,
        status: found.status,
        review: found.review,
        read_time: found.read_time,
        read_date: found.read_date,
        release_date: found.release_date || '',
        word_count: found.word_count,
        publisher: found.publisher,
        series: found.series,
        series_order: found.series_order,
      }
      selectedTags.value = [...found.tags]
      authorList.value = (found.authors || []).map((a: any) => ({ name: a.name, role: a.role || 'writer', id: a.id }))
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
    if (pendingCoverFile.value) {
      uploading.value = true
      const newUrl = await uploadToStorage(pendingCoverFile.value)
      form.value.cover_url = newUrl
      uploading.value = false
    }

    const payload = {
      ...form.value,
      tags: selectedTags.value,
      authors: authorList.value.filter(a => a.name.trim()),
      links: linkList.value,
    }

    if (isNew.value) {
      await $fetch('/api/admin/novels', { method: 'POST', body: payload })
    } else {
      await $fetch(`/api/admin/novels/${id.value}`, { method: 'PUT', body: payload })
    }

    if (originalCoverUrl.value && originalCoverUrl.value !== form.value.cover_url) {
      const oldPath = getStoragePath(originalCoverUrl.value)
      if (oldPath) {
        await $supabase.storage.from('covers').remove([oldPath])
      }
    }

    await refreshNovelData()
    await router.push('/admin')
  } catch (e: any) {
    alert(e.message || 'Save failed')
    saving.value = false
    uploading.value = false
  }
}

function cancelEdit() {
  if (coverPreviewUrl.value) URL.revokeObjectURL(coverPreviewUrl.value)
  router.push('/admin')
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <button @click="router.back()" class="text-indigo-400 hover:text-indigo-300 transition-colors text-sm">
      &larr; 返回上一级
    </button>

    <h1 class="text-2xl font-bold text-white border-l-4 border-indigo-500 pl-4 mt-4 mb-8">
      {{ isNew ? '新建小说' : '编辑小说' }}
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
        <input
          v-model="form.cover_url"
          type="url"
          placeholder="https://..."
          class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 text-sm"
        />
        <div v-if="coverPreviewUrl || form.cover_url" class="mt-2 w-48">
          <img
            :src="coverPreviewUrl || form.cover_url"
            alt="Cover preview"
            :style="{ aspectRatio: useCoverConfig().novelAspectRatio }"
            class="w-full object-cover rounded border border-gray-700"
            @error="($event.target as HTMLImageElement).style.display = 'none'"
          />
        </div>
      </div>

      <!-- Rating + Status + Word Count -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <option value="completed">已读完</option>
            <option value="reading">阅读中</option>
            <option value="plan_to_read">想读</option>
            <option value="dropped">已弃坑</option>
          </select>
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-1">字数</label>
          <input
            v-model.number="form.word_count"
            type="number"
            min="0"
            placeholder="选填"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
      </div>

      <!-- Publisher + Series + Series Order + Read Date + Release Date + Read Time -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div>
          <label class="block text-gray-400 text-sm mb-1">出版社</label>
          <input
            v-model="form.publisher"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-1">所属系列</label>
          <input
            v-model="form.series"
            placeholder="例：物语系列"
            list="series-datalist"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
          <datalist id="series-datalist">
            <option v-for="s in (seriesOptions || [])" :key="s.id" :value="s.name" />
          </datalist>
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-1">系列顺序</label>
          <input
            v-model.number="form.series_order"
            type="number"
            min="1"
            placeholder="1"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-1">读完日期</label>
          <input
            v-model="form.read_date"
            type="date"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-1">发表时间</label>
          <input
            v-model="form.release_date"
            type="date"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-1">阅读时长</label>
          <input
            v-model="form.read_time"
            placeholder="例：3 天"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
      </div>

      <!-- Authors -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-gray-400 text-sm">作者</label>
          <button
            type="button"
            @click="addAuthor"
            class="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors"
          >
            + 添加作者
          </button>
        </div>
        <div v-if="authorList.length === 0" class="text-gray-600 text-xs">暂无作者</div>
        <div v-else class="space-y-3">
          <div v-for="(author, i) in authorList" :key="i" class="flex items-center gap-2">
            <input
              v-model="author.name"
              type="text"
              placeholder="名称"
              class="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
            />
            <select
              v-model="author.role"
              class="w-24 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-sm focus:outline-none focus:border-indigo-500/50"
            >
              <option value="writer">执笔</option>
              <option value="illustrator">插画</option>
              <option value="original_work">原作</option>
            </select>
            <button
              type="button"
              @click="removeAuthor(i)"
              class="text-red-400 hover:text-red-300 text-xs flex-shrink-0"
            >
              删除
            </button>
          </div>
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
          <label class="text-gray-400 text-sm">阅读链接</label>
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
      :aspectRatio="useCoverConfig().novelAspectRatio"
      @crop="onCropConfirm"
      @cancel="onCropCancel"
    />
  </div>
</template>
