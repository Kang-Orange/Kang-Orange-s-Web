<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { data: categories, refresh: refreshCats } = useAsyncData('admin-categories', () => useRequestFetch()('/api/admin/categories'))
const { data: allTags, refresh: refreshTags } = useAsyncData<{ id: number; name: string; category_id: number | null }[]>('admin-tags-manage', () => useRequestFetch()('/api/admin/tags'))
const { refreshGameData } = useGameData()

// ---- Category CRUD ----
const newCatName = ref('')
const newCatSort = ref(0)
const editingCat = ref<number | null>(null)
const editCatName = ref('')
const editCatSort = ref(0)

async function createCategory() {
  if (!newCatName.value.trim()) return
  await $fetch('/api/admin/categories', { method: 'POST', body: { name: newCatName.value.trim(), sort_order: newCatSort.value } })
  newCatName.value = ''
  newCatSort.value = 0
  await refreshCats()
}

function startEditCat(cat: { id: number; name: string; sort_order: number }) {
  editingCat.value = cat.id
  editCatName.value = cat.name
  editCatSort.value = cat.sort_order
}

async function saveEditCat(id: number) {
  if (!editCatName.value.trim()) return
  await $fetch(`/api/admin/categories/${id}`, { method: 'PUT', body: { name: editCatName.value.trim(), sort_order: editCatSort.value } })
  editingCat.value = null
  await refreshCats()
}

async function removeCategory(id: number, name: string) {
  if (!confirm(`Delete category "${name}"? Tags in this category will become uncategorized.`)) return
  await $fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
  await refreshCats()
  await refreshTags()
}

// ---- Tag CRUD ----
const newTagName = ref('')
const newTagCat = ref<number | null>(null)

async function createTag() {
  const name = newTagName.value.trim()
  if (!name) return
  await $fetch('/api/admin/tags', { method: 'POST', body: { name, category_id: newTagCat.value } })
  newTagName.value = ''
  newTagCat.value = null
  await refreshTags()
  refreshGameData()
}

async function updateTagCategory(tagId: number, categoryId: number | null) {
  await $fetch(`/api/admin/tags/${tagId}`, { method: 'PUT', body: { category_id: categoryId } })
  await refreshTags()
  refreshGameData()
}

async function deleteTag(id: number, name: string) {
  if (!confirm(`Delete tag "${name}"? It will be removed from all games.`)) return
  await $fetch(`/api/admin/tags/${id}`, { method: 'DELETE' })
  await refreshTags()
  refreshGameData()
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <NuxtLink to="/admin" class="text-indigo-400 hover:text-indigo-300 transition-colors text-sm">
      &larr; 返回管理
    </NuxtLink>

    <h1 class="text-2xl font-bold text-white border-l-4 border-indigo-500 pl-4 mt-4 mb-8">
      分类 & 标签管理
    </h1>

    <!-- ===== Category Management ===== -->
    <section class="mb-10">
      <h2 class="text-lg font-semibold text-gray-200 mb-4">分类</h2>

      <!-- Add category -->
      <div class="flex gap-2 mb-4">
        <input
          v-model="newCatName"
          type="text"
          placeholder="新分类名"
          class="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 text-sm"
          @keyup.enter="createCategory"
        />
        <input
          v-model.number="newCatSort"
          type="number"
          placeholder="排序"
          class="w-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 text-sm"
          @keyup.enter="createCategory"
        />
        <button
          @click="createCategory"
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors flex-shrink-0"
        >
          新增
        </button>
      </div>

      <!-- Category list -->
      <div class="space-y-1">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="flex items-center gap-2 bg-gray-800 border border-gray-700/50 rounded-lg px-4 py-2"
        >
          <template v-if="editingCat === cat.id">
            <input v-model="editCatName" type="text" class="flex-1 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-gray-200 text-sm focus:outline-none focus:border-indigo-500/50" />
            <input v-model.number="editCatSort" type="number" class="w-20 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-gray-200 text-sm focus:outline-none focus:border-indigo-500/50" />
            <button @click="saveEditCat(cat.id)" class="text-emerald-400 hover:text-emerald-300 text-xs px-2">保存</button>
            <button @click="editingCat = null" class="text-gray-400 hover:text-gray-300 text-xs px-2">取消</button>
          </template>
          <template v-else>
            <span class="flex-1 text-gray-200 text-sm">{{ cat.name }}</span>
            <span class="text-gray-500 text-xs w-8 text-right">{{ cat.sort_order }}</span>
            <button @click="startEditCat(cat)" class="text-indigo-400 hover:text-indigo-300 text-xs px-1">编辑</button>
            <button @click="removeCategory(cat.id, cat.name)" class="text-red-400 hover:text-red-300 text-xs px-1">删除</button>
          </template>
        </div>
        <div v-if="categories && categories.length === 0" class="text-center py-8 text-gray-500 text-sm">
          还没有分类
        </div>
      </div>
    </section>

    <!-- ===== Tag Management ===== -->
    <section>
      <h2 class="text-lg font-semibold text-gray-200 mb-4">标签</h2>

      <!-- Add tag -->
      <div class="flex gap-2 mb-4">
        <input
          v-model="newTagName"
          type="text"
          placeholder="新标签名"
          class="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 text-sm"
          @keyup.enter="createTag"
        />
        <select
          v-model="newTagCat"
          class="w-32 px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-sm focus:outline-none focus:border-indigo-500/50"
        >
          <option :value="null">(无分类)</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
        <button
          @click="createTag"
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors flex-shrink-0"
        >
          新增
        </button>
      </div>

      <!-- Tag list -->
      <div class="space-y-1">
        <div
          v-for="tag in allTags"
          :key="tag.id"
          class="flex items-center gap-2 bg-gray-800 border border-gray-700/50 rounded-lg px-4 py-2"
        >
          <span class="flex-1 text-gray-200 text-sm">{{ tag.name }}</span>
          <select
            :value="tag.category_id ?? null"
            @change="updateTagCategory(tag.id, ($event.target as HTMLSelectElement).value === '' ? null : Number(($event.target as HTMLSelectElement).value))"
            class="w-28 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-gray-400 text-xs focus:outline-none focus:border-indigo-500/50"
          >
            <option value="">无分类</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
          <button @click="deleteTag(tag.id, tag.name)" class="text-red-400 hover:text-red-300 text-xs px-1 flex-shrink-0">删除</button>
        </div>
        <div v-if="allTags && allTags.length === 0" class="text-center py-8 text-gray-500 text-sm">
          还没有标签
        </div>
      </div>
    </section>
  </div>
</template>
