<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { gameList } = useGameData()

const sections = computed(() => [
  {
    title: '游戏',
    count: (gameList.value || []).length,
    description: '游戏管理',
    to: '/admin/games',
    available: true,
  },
  {
    title: '小说',
    count: null,
    description: '即将推出',
    to: '',
    available: false,
  },
  {
    title: '作者',
    count: null,
    description: '即将推出',
    to: '',
    available: false,
  },
  {
    title: '分类 & 标签',
    count: null,
    description: '标签词库与分类管理',
    to: '/admin/categories',
    available: true,
  },
])
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-2xl font-bold text-white border-l-4 border-indigo-500 pl-4 mb-8">
      管理后台
    </h1>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <template v-for="section in sections" :key="section.title">
        <NuxtLink
          v-if="section.available"
          :to="section.to"
          class="block bg-gray-800 border border-gray-700/50 hover:border-indigo-500/50 rounded-lg p-6 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 hover:scale-[1.02]"
        >
          <h2 class="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
            {{ section.title }}
          </h2>
          <p class="text-gray-500 text-sm mt-1">{{ section.description }}</p>
          <p v-if="section.count !== null" class="text-indigo-400 text-2xl font-bold mt-3">{{ section.count }}</p>
        </NuxtLink>

        <div
          v-else
          class="block bg-gray-800/50 border border-gray-700/30 rounded-lg p-6 opacity-60 cursor-not-allowed"
        >
          <h2 class="text-lg font-bold text-gray-400">{{ section.title }}</h2>
          <p class="text-gray-600 text-sm mt-1">{{ section.description }}</p>
        </div>
      </template>
    </div>
  </div>
</template>
