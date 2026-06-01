<script setup lang="ts">
const route = useRoute()
const { getVNById } = useVNData()

const vn = computed(() => getVNById(Number(route.params.id)))
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Error state: invalid ID -->
    <div v-if="!vn" class="text-center py-20">
      <p class="text-gray-400 text-lg mb-4">找不到该作品</p>
      <NuxtLink to="/" class="text-indigo-400 hover:text-indigo-300 transition-colors">
        &larr; 返回列表
      </NuxtLink>
    </div>

    <template v-else>
      <!-- Back link -->
      <NuxtLink to="/" class="text-indigo-400 hover:text-indigo-300 transition-colors text-sm">
        &larr; 返回列表
      </NuxtLink>

      <!-- Hero section -->
      <div class="flex flex-col md:flex-row gap-8 mt-6">
        <div class="w-48 md:w-64 flex-shrink-0">
          <div class="rounded-lg overflow-hidden border border-gray-700">
            <img
              :src="vn.cover_url"
              :alt="vn.title"
              :style="{ aspectRatio: useCoverConfig().aspectRatio }" class="w-full object-cover"
            />
          </div>
        </div>

        <div class="flex-1 space-y-3">
          <h1 class="text-2xl font-bold text-white">{{ vn.title }}</h1>
          <p class="text-gray-400 italic">{{ vn.original_title }}</p>
          <div class="flex items-center gap-2">
            <RatingDisplay :rating="vn.rating" />
            <StatusBadge :status="vn.status" />
          </div>
          <div class="text-gray-300 text-sm space-y-1">
            <p>开发商：{{ vn.developer }}</p>
            <p>发售日：{{ vn.release_date }}</p>
            <p>游玩时长：{{ vn.play_time }}</p>
          </div>
          <TagList :tags="vn.tags" :max="99" />
        </div>
      </div>

      <!-- Summary -->
      <section class="mt-10">
        <h2 class="text-xl font-bold text-white border-l-4 border-indigo-500 pl-3 mb-4">简介</h2>
        <p class="text-gray-300 leading-relaxed">{{ vn.summary }}</p>
      </section>

      <!-- Review -->
      <section v-if="vn.review" class="mt-10">
        <h2 class="text-xl font-bold text-white border-l-4 border-indigo-500 pl-3 mb-4">个人评测</h2>
        <div class="bg-gray-800 border border-gray-700/50 rounded-lg p-6">
          <p class="text-gray-300 leading-relaxed whitespace-pre-line">{{ vn.review }}</p>
        </div>
      </section>
    </template>
  </div>
</template>
