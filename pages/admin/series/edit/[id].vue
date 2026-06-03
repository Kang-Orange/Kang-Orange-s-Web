<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
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

const form = ref({
  name: '',
  description: '',
  cover_url: '',
  sort_order: 0,
})

// Load existing
if (!isNew.value) {
  const { data } = useAsyncData<any[]>('admin-series-edit', () => useRequestFetch()('/api/admin/series'))
  watch(data, (list) => {
    if (!list) return
    const found = list.find((s: any) => s.id === id.value) || list.find((s: any) => s.id === Number(id.value))
    if (found) {
      form.value = {
        name: found.name,
        description: found.description || '',
        cover_url: found.cover_url || '',
        sort_order: found.sort_order ?? 0,
      }
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
      form.value.cover_url = await uploadToStorage(pendingCoverFile.value)
      uploading.value = false
    }

    if (isNew.value) {
      await $fetch('/api/admin/series', { method: 'POST', body: form.value })
    } else {
      await $fetch(`/api/admin/series/${id.value}`, { method: 'PUT', body: form.value })
    }
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
      {{ isNew ? '新建系列' : '编辑系列' }}
    </h1>

    <div v-if="loading" class="text-center py-20 text-gray-500">加载中...</div>

    <form v-else @submit.prevent="save" class="space-y-6">
      <!-- Name -->
      <div>
        <label class="block text-gray-400 text-sm mb-1">名称 <span class="text-red-400">*</span></label>
        <input
          v-model="form.name"
          required
          class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
        />
      </div>

      <!-- Description -->
      <div>
        <label class="block text-gray-400 text-sm mb-1">简介</label>
        <textarea
          v-model="form.description"
          rows="3"
          class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm resize-y"
        />
      </div>

      <!-- Cover -->
      <div>
        <label class="block text-gray-400 text-sm mb-1">封面图片</label>
        <div class="flex items-center gap-2 mb-2">
          <label class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors cursor-pointer">
            {{ pendingCoverFile ? '更换图片' : '选择图片' }}
            <input type="file" accept="image/*" class="hidden" :key="coverInputKey" @change="onCoverFileChange" :disabled="saving" />
          </label>
          <button v-if="pendingCoverFile" type="button" @click="clearPendingCover" class="text-xs text-red-400 hover:text-red-300">清除</button>
          <span v-else class="text-xs text-gray-500">或粘贴链接</span>
        </div>
        <input
          v-model="form.cover_url"
          type="url"
          placeholder="https://..."
          class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 text-sm"
        />
        <div v-if="coverPreviewUrl || form.cover_url" class="mt-2 w-32">
          <img
            :src="coverPreviewUrl || form.cover_url"
            alt="Cover preview"
            :style="{ aspectRatio: useCoverConfig().novelAspectRatio }"
            class="w-full object-cover rounded border border-gray-700"
            @error="($event.target as HTMLImageElement).style.display = 'none'"
          />
        </div>
      </div>

      <!-- Sort Order -->
      <div>
        <label class="block text-gray-400 text-sm mb-1">排序</label>
        <input
          v-model.number="form.sort_order"
          type="number"
          min="0"
          class="w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500/50 text-sm"
        />
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
      :aspectRatio="useCoverConfig().novelAspectRatio"
      @crop="onCropConfirm"
      @cancel="onCropCancel"
    />
  </div>
</template>
