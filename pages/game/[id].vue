<script setup lang="ts">
const route = useRoute()
const { getGameById } = useGameData()

const game = computed(() => getGameById(Number(route.params.id)))
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Error state: invalid ID -->
    <div v-if="!game" class="text-center py-20">
      <p class="text-gray-400 text-lg mb-4">找不到该作品</p>
      <NuxtLink to="/game/" class="text-indigo-400 hover:text-indigo-300 transition-colors">
        &larr; 返回列表
      </NuxtLink>
    </div>

    <template v-else>
      <!-- Back link -->
      <NuxtLink to="/game/" class="text-indigo-400 hover:text-indigo-300 transition-colors text-sm">
        &larr; 返回列表
      </NuxtLink>

      <!-- Hero section -->
      <div class="flex flex-col md:flex-row gap-8 mt-6">
        <div class="w-48 md:w-96 flex-shrink-0">
          <div class="rounded-lg overflow-hidden border border-gray-700">
            <img
              :src="game.cover_url"
              :alt="game.title"
              :style="{ aspectRatio: useCoverConfig().aspectRatio }" class="w-full object-cover"
            />
          </div>
        </div>

        <div class="flex-1 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs px-2 py-0.5 rounded font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {{ game.genre || 'VN' }}
              </span>
              <span v-if="game.dev_status && game.dev_status !== '已发布'" class="text-xs px-2 py-0.5 rounded font-bold border"
                :class="game.dev_status === '开发中' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-stone-500/20 text-stone-300 border-stone-500/30'">
                {{ game.dev_status }}
              </span>
              <span class="text-xs px-2 py-0.5 rounded font-bold border" :class="{
                'bg-emerald-500/20 text-emerald-400 border-emerald-500/30': game.status === 'completed',
                'bg-blue-500/20 text-blue-400 border-blue-500/30': game.status === 'playing',
                'bg-gray-500/20 text-gray-400 border-gray-500/30': game.status === 'plan_to_play',
                'bg-red-500/20 text-red-400 border-red-500/30': game.status === 'dropped'
              }">
                {{ { completed: '已完成', playing: '游玩中', plan_to_play: '计划中', dropped: '已弃坑' }[game.status] }}
              </span>
            </div>
            <PlatformIcons :platforms="game.platforms || []" />
          </div>
          <h1 class="text-2xl font-bold text-white">{{ game.title?.trim() || game.original_title?.trim() || '(无标题)' }}</h1>
          <p v-if="game.title?.trim() && game.original_title?.trim()" class="text-gray-400 italic">{{ game.original_title }}</p>
          <div>
            <RatingDisplay :rating="game.rating" size="md" />
          </div>
          <div v-if="(game.developers && game.developers.length > 0) || game.release_date || game.play_date || game.play_time" class="text-gray-300 text-sm space-y-1">
            <p v-if="game.developers && game.developers.length > 0">
              制作组/制作人员：
              <template v-for="(d, i) in game.developers" :key="d.id">
                <span>{{ d.name }}</span>
                <span v-if="d.role" class="text-gray-500 text-xs ml-0.5">（{{ d.role }}）</span>
                <span v-if="i < game.developers.length - 1">、</span>
              </template>
            </p>
            <p v-if="game.release_date">发售日：{{ game.release_date }}</p>
            <p v-if="game.play_date">通关日期：{{ game.play_date }}</p>
            <p v-if="game.play_time">游玩时长：{{ game.play_time }}</p>
          </div>
          <TagList :tags="game.tags" :max="99" />
        </div>
      </div>

      <!-- Languages -->
      <section v-if="game.languages && game.languages.length > 0" class="mt-10">
        <h2 class="text-xl font-bold text-white border-l-4 border-indigo-500 pl-3 mb-4">语言</h2>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="lang in game.languages"
            :key="lang"
            class="px-3 py-1 text-sm rounded-full bg-gray-800 text-gray-300 border border-gray-700/50"
          >
            {{ lang }}
          </span>
        </div>
      </section>

      <!-- Links -->
      <section v-if="game.links && game.links.length > 0" class="mt-10">
        <h2 class="text-xl font-bold text-white border-l-4 border-indigo-500 pl-3 mb-4">链接</h2>
        <template v-for="linkType in (['acquisition', 'related'] as const)" :key="linkType">
          <div v-if="game.links.filter(l => l.type === linkType).length > 0" class="mb-4 last:mb-0">
            <p class="text-gray-500 text-xs mb-2">{{ linkType === 'acquisition' ? '获取途径' : '相关链接' }}</p>
            <div class="flex flex-wrap gap-2">
              <a
                v-for="(link, i) in game.links.filter(l => l.type === linkType)"
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
          </div>
        </template>
      </section>

      <!-- Summary -->
      <section v-if="game.summary" class="mt-10">
        <h2 class="text-xl font-bold text-white border-l-4 border-indigo-500 pl-3 mb-4">简介</h2>
        <p class="text-gray-300 leading-relaxed">{{ game.summary }}</p>
      </section>

      <!-- Review -->
      <section v-if="game.review" class="mt-10">
        <h2 class="text-xl font-bold text-white border-l-4 border-indigo-500 pl-3 mb-4">个人评测</h2>
        <div class="bg-gray-800 border border-gray-700/50 rounded-lg p-6">
          <p class="text-gray-300 leading-relaxed whitespace-pre-line">{{ game.review }}</p>
        </div>
      </section>
    </template>
  </div>
</template>
