<script setup lang="ts">
import type { VNEntry } from '~/composables/useVNData'

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
})

// Tags
const { data: allTags } = useAsyncData<{ id: number; name: string; category_id: number | null }[]>('admin-tags', () => useRequestFetch()('/api/admin/tags'))
const { data: categories } = useAsyncData<{ id: number; name: string }[]>('admin-categories-edit', () => useRequestFetch()('/api/admin/categories'))
const selectedTags = ref<string[]>([])
const newTagName = ref('')
const newTagCategory = ref<number | null>(null)

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
      }
      selectedTags.value = [...found.tags]
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

    const payload = { ...form.value, tags: selectedTags.value }

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
      &larr; Back to Admin
    </NuxtLink>

    <h1 class="text-2xl font-bold text-white border-l-4 border-indigo-500 pl-4 mt-4 mb-8">
      {{ isNew ? 'New Entry' : 'Edit Entry' }}
    </h1>

    <div v-if="loading" class="text-center py-20 text-gray-500">Loading...</div>

    <form v-else @submit.prevent="save" class="space-y-6">
      <!-- Title -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-gray-400 text-sm mb-1">Title</label>
          <input
            v-model="form.title"
            required
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-1">Original Title</label>
          <input
            v-model="form.original_title"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
      </div>

      <!-- Cover Image -->
      <div>
        <label class="block text-gray-400 text-sm mb-1">Cover Image</label>

        <!-- Upload -->
        <div class="flex items-center gap-2 mb-2">
          <label class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors cursor-pointer">
            {{ pendingCoverFile ? 'Change Image' : 'Choose Image' }}
            <input type="file" accept="image/*" class="hidden" :key="coverInputKey" @change="onCoverFileChange" :disabled="saving" />
          </label>
          <button
            v-if="pendingCoverFile"
            type="button"
            @click="clearPendingCover"
            class="text-xs text-red-400 hover:text-red-300"
          >
            Clear
          </button>
          <span v-else class="text-xs text-gray-500">or paste URL below</span>
        </div>

        <!-- URL input -->
        <input
          v-model="form.cover_url"
          type="url"
          placeholder="https://..."
          class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 text-sm"
        />

        <!-- Preview -->
        <div v-if="coverPreviewUrl || form.cover_url" class="mt-2 w-24">
          <img
            :src="coverPreviewUrl || form.cover_url"
            alt="Cover preview"
            :style="{ aspectRatio: useCoverConfig().aspectRatio }" class="w-full object-cover rounded border border-gray-700"
            @error="($event.target as HTMLImageElement).style.display = 'none'"
          />
        </div>
      </div>

      <!-- Rating + Status + Developer -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-gray-400 text-sm mb-1">Rating</label>
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
          <label class="block text-gray-400 text-sm mb-1">Status</label>
          <select
            v-model="form.status"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          >
            <option value="completed">Completed</option>
            <option value="playing">Playing</option>
            <option value="plan_to_play">Plan to Play</option>
            <option value="dropped">Dropped</option>
          </select>
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-1">Developer</label>
          <input
            v-model="form.developer"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
      </div>

      <!-- Play Time + Play Date + Release Date -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-gray-400 text-sm mb-1">Play Time</label>
          <input
            v-model="form.play_time"
            placeholder="e.g. 30 hours"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-1">Play Date</label>
          <input
            v-model="form.play_date"
            type="date"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-1">Release Date</label>
          <input
            v-model="form.release_date"
            type="date"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
      </div>

      <!-- Summary -->
      <div>
        <label class="block text-gray-400 text-sm mb-1">Summary</label>
        <textarea
          v-model="form.summary"
          rows="4"
          class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm resize-y"
        />
      </div>

      <!-- Review -->
      <div>
        <label class="block text-gray-400 text-sm mb-1">Review</label>
        <textarea
          v-model="form.review"
          rows="6"
          class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm resize-y"
        />
      </div>

      <!-- Tags -->
      <div>
        <label class="block text-gray-400 text-sm mb-2">Tags</label>

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
            placeholder="New tag name..."
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
            Add
          </button>
        </div>
      </div>

      <!-- Submit -->
      <div class="flex gap-3 pt-4 border-t border-gray-800">
        <button
          type="submit"
          :disabled="saving"
          class="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
        >
          {{ saving ? 'Saving...' : (isNew ? 'Create' : 'Save') }}
        </button>
        <button
          type="button"
          @click="cancelEdit"
          class="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
        >
          Cancel
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
