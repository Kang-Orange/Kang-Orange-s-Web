<script setup lang="ts">
import { LINK_ICONS } from '~/composables/useGameData'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const { refreshNovelData } = useNovelData()
const { $supabase } = useNuxtApp()

const isNew = computed(() => route.params.id === 'new')
const id = computed(() => isNew.value ? null : Number(route.params.id))

const loading = ref(!isNew.value)
const saving = ref(false)
const uploading = ref(false)
const pendingCoverFile = ref<File | null>(null)
const coverPreviewUrl = ref<string | null>(null)
const coverInputKey = ref(0)
const showCropper = ref(false)
const cropSource = ref<string | null>(null)

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

async function uploadToStorage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await $supabase.storage.from('covers').upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new Error('Upload failed: ' + error.message)
  const { data: urlData } = $supabase.storage.from('covers').getPublicUrl(path)
  return urlData.publicUrl
}

// Form
const form = ref({
  name: '',
  avatar_url: '',
  bio: '',
})

// Links
const linkList = ref<{ name: string; url: string; type: string; icon?: string }[]>([])

function addLink() {
  linkList.value.push({ name: '', url: '', type: 'related', icon: undefined })
}

function removeLink(index: number) {
  linkList.value.splice(index, 1)
}

// Load existing
if (!isNew.value) {
  const { data: authors } = useAsyncData<any[]>('admin-authors', () => useRequestFetch()('/api/admin/authors'))
  watch(authors, (list) => {
    if (!list) return
    const found = list.find((a: any) => a.id === id.value) || list.find((a: any) => a.id === Number(id.value))
    if (found) {
      form.value = {
        name: found.name,
        avatar_url: found.avatar_url,
        bio: found.bio,
      }
      linkList.value = (found.links || []).map((l: any) => ({ ...l }))
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
      form.value.avatar_url = await uploadToStorage(pendingCoverFile.value)
      uploading.value = false
    }

    const payload = {
      ...form.value,
      links: linkList.value,
    }

    if (isNew.value) {
      await $fetch('/api/admin/authors', { method: 'POST', body: payload })
    } else {
      await $fetch(`/api/admin/authors/${id.value}`, { method: 'PUT', body: payload })
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
  <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <button @click="router.back()" class="text-indigo-400 hover:text-indigo-300 transition-colors text-sm">
      &larr; 返回上一级
    </button>

    <h1 class="text-2xl font-bold text-white border-l-4 border-indigo-500 pl-4 mt-4 mb-8">
      {{ isNew ? '新建作者' : '编辑作者' }}
    </h1>

    <div v-if="loading" class="text-center py-20 text-gray-500">加载中...</div>

    <form v-else @submit.prevent="save" class="space-y-6">
      <!-- Name -->
      <div>
        <label class="block text-gray-400 text-sm mb-1">名称</label>
        <input
          v-model="form.name"
          required
          class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
        />
      </div>

      <!-- Avatar -->
      <div>
        <label class="block text-gray-400 text-sm mb-1">头像</label>
        <div class="flex items-center gap-2 mb-2">
          <label class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors cursor-pointer">
            {{ pendingCoverFile ? '更换图片' : '选择图片' }}
            <input type="file" accept="image/*" class="hidden" :key="coverInputKey" @change="onCoverFileChange" :disabled="saving" />
          </label>
          <button v-if="pendingCoverFile" type="button" @click="clearPendingCover" class="text-xs text-red-400 hover:text-red-300">清除</button>
          <span v-else class="text-xs text-gray-500">或粘贴链接</span>
        </div>
        <input
          v-model="form.avatar_url"
          type="url"
          placeholder="https://..."
          class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 text-sm"
        />
        <div v-if="coverPreviewUrl || form.avatar_url" class="mt-2 w-16 h-16 rounded-full overflow-hidden border border-gray-700">
          <img
            :src="coverPreviewUrl || form.avatar_url"
            alt="Avatar preview"
            class="w-full h-full object-cover"
            @error="($event.target as HTMLImageElement).style.display = 'none'"
          />
        </div>
      </div>

      <!-- Bio -->
      <div>
        <label class="block text-gray-400 text-sm mb-1">简介</label>
        <textarea
          v-model="form.bio"
          rows="4"
          class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm resize-y"
        />
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
          {{ saving ? (uploading ? '上传中...' : '保存中...') : (isNew ? '创建' : '保存') }}
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
