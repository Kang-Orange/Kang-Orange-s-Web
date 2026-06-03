<script setup lang="ts">
import type { NovelEntry } from '~/composables/useNovelData'

const route = useRoute()
const { getNovelById } = useNovelData()

const novel = computed(() => getNovelById(Number(route.params.id)))
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Error state -->
    <div v-if="!novel" class="text-center py-20">
      <p class="text-gray-400 text-lg mb-4">找不到该作品</p>
      <NuxtLink to="/novel/" class="text-indigo-400 hover:text-indigo-300 transition-colors">
        &larr; 返回列表
      </NuxtLink>
    </div>

    <template v-else>
      <!-- Back link -->
      <NuxtLink to="/novel/" class="text-indigo-400 hover:text-indigo-300 transition-colors text-sm">
        &larr; 返回列表
      </NuxtLink>

      <!-- Hero section -->
      <div class="flex flex-col md:flex-row gap-8 mt-6">
        <div class="w-40 md:w-64 flex-shrink-0">
          <div class="rounded-lg overflow-hidden border border-gray-700">
            <img
              :src="novel.cover_url"
              :alt="novel.title"
              :style="{ aspectRatio: useCoverConfig().novelAspectRatio }"
              class="w-full object-cover"
            />
          </div>
        </div>

        <div class="flex-1 space-y-3">
          <div class="flex items-center gap-2">
            <StatusBadge :status="novel.status" />
          </div>
          <h1 class="text-2xl font-bold text-white">
            {{ novel.title?.trim() || novel.original_title?.trim() || '(无标题)' }}
          </h1>
          <p v-if="novel.title?.trim() && novel.original_title?.trim()" class="text-gray-400 italic">
            {{ novel.original_title }}
          </p>
          <div>
            <RatingDisplay :rating="novel.rating" size="md" />
          </div>
          <div class="text-gray-300 text-sm space-y-1">
            <p v-if="novel.authors && novel.authors.length > 0">
              作者：
              <template v-for="(a, i) in novel.authors" :key="a.id">
                <NuxtLink
                  :to="'/novel/author/' + a.id"
                  class="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {{ a.name }}
                </NuxtLink>
                <span v-if="i < novel.authors.length - 1">、</span>
              </template>
            </p>
            <p v-if="novel.publisher">出版社：{{ novel.publisher }}</p>
            <p v-if="novel.series">所属系列：<NuxtLink :to="'/novel/series/' + encodeURIComponent(novel.series)" class="text-indigo-400 hover:text-indigo-300 transition-colors">{{ novel.series }}</NuxtLink></p>
            <p v-if="novel.word_count">字数：{{ novel.word_count.toLocaleString() }} 字</p>
            <p v-if="novel.release_date">发表时间：{{ novel.release_date }}</p>
            <p v-if="novel.read_date">读完日期：{{ novel.read_date }}</p>
            <p v-if="novel.read_time">阅读时长：{{ novel.read_time }}</p>
          </div>
          <TagList :tags="novel.tags" :max="99" />
        </div>
      </div>

      <!-- Links -->
      <section v-if="novel.links && novel.links.length > 0" class="mt-10">
        <h2 class="text-xl font-bold text-white border-l-4 border-indigo-500 pl-3 mb-4">阅读链接</h2>
        <div class="flex flex-wrap gap-2">
          <a
            v-for="(link, i) in novel.links"
            :key="i"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-800 border border-gray-700/50 text-gray-200 hover:text-white hover:border-gray-600 transition-colors group"
          >
            <LinkIcon :url="link.url" :icon="link.icon" />
            <span>{{ link.name }}</span>
          </a>
        </div>
      </section>

      <!-- Summary -->
      <section v-if="novel.summary" class="mt-10">
        <h2 class="text-xl font-bold text-white border-l-4 border-indigo-500 pl-3 mb-4">简介</h2>
        <p class="text-gray-300 leading-relaxed">{{ novel.summary }}</p>
      </section>

      <!-- Review -->
      <section v-if="novel.review" class="mt-10">
        <h2 class="text-xl font-bold text-white border-l-4 border-indigo-500 pl-3 mb-4">个人评测</h2>
        <div class="bg-gray-800 border border-gray-700/50 rounded-lg p-6">
          <p class="text-gray-300 leading-relaxed whitespace-pre-line">{{ novel.review }}</p>
        </div>
      </section>
    </template>
  </div>
</template>
