<script setup lang="ts">
const { filteredList, vnList } = useVNData()

const hasActiveFilter = computed(() => filteredList.value.length !== (vnList.value || []).length)
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-white border-l-4 border-indigo-500 pl-4">
        Game
      </h1>
      <p class="text-gray-500 text-sm mt-2 pl-5">
        <template v-if="hasActiveFilter">
          筛选出 {{ filteredList.length }} / 共 {{ (vnList || []).length }} 款游戏
        </template>
        <template v-else>
          共 {{ (vnList || []).length }} 款游戏
        </template>
      </p>
    </div>

    <FilterBar />

    <div
      v-if="filteredList.length > 0"
      class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      <VNCard v-for="vn in filteredList" :key="vn.id" :vn="vn" />
    </div>

    <div v-else class="text-center py-20">
      <p class="text-gray-500 text-lg">没有找到匹配的作品</p>
      <p class="text-gray-600 text-sm mt-2">试试调整筛选条件或搜索词</p>
    </div>
  </div>
</template>
