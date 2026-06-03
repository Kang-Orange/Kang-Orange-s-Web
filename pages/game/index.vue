<script setup lang="ts">
const { filteredList, gameList, pending } = useGameData()

const hasActiveFilter = computed(() => filteredList.value.length !== (gameList.value || []).length)
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-white border-l-4 border-indigo-500 pl-4">
        游戏
      </h1>
      <p class="text-gray-500 text-sm mt-2 pl-5">
        <template v-if="hasActiveFilter">
          筛选出 {{ filteredList.length }} / 共 {{ (gameList || []).length }} 款游戏
        </template>
        <template v-else>
          共 {{ (gameList || []).length }} 款游戏
        </template>
      </p>
    </div>

    <FilterBar />

    <!-- Loading skeleton -->
    <div v-if="pending" class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div v-for="n in 8" :key="n" class="bg-gray-800 rounded-lg overflow-hidden border border-gray-700/50 animate-pulse">
        <div :style="{ aspectRatio: useCoverConfig().aspectRatio }" class="bg-gray-700" />
        <div class="p-3 space-y-2">
          <div class="h-4 bg-gray-700 rounded w-3/4" />
          <div class="flex items-center justify-between">
            <div class="h-3 bg-gray-700 rounded w-16" />
            <div class="h-4 bg-gray-700 rounded w-12" />
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="filteredList.length > 0"
      class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      <GameCard v-for="game in filteredList" :key="game.id" :game="game" />
    </div>

    <div v-else-if="!pending" class="text-center py-20">
      <p class="text-gray-500 text-lg">没有找到匹配的作品</p>
      <p class="text-gray-600 text-sm mt-2">试试调整筛选条件或搜索词</p>
    </div>
  </div>
</template>
