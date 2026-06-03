<script setup lang="ts">
import type { NovelEntry } from '~/composables/useNovelData'
import { NOVEL_STATUS_LABELS } from '~/composables/useNovelData'

const props = defineProps<{
  novel: NovelEntry
}>()

const shortReview = computed(() => {
  const text = props.novel.review || props.novel.summary
  if (!text) return ''
  return text.length > 50 ? text.slice(0, 50) + '…' : text
})

const primaryTitle = computed(() => props.novel.title?.trim() || props.novel.original_title?.trim() || '(无标题)')
const secondaryTitle = computed(() => {
  if (props.novel.title?.trim() && props.novel.original_title?.trim()) return props.novel.original_title
  return null
})

const primaryAuthor = computed(() => props.novel.authors?.[0]?.name || '')
</script>

<template>
  <NuxtLink
    :to="'/novel/' + novel.id"
    class="group block bg-gray-800 rounded-lg overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-indigo-500/10"
  >
    <CoverImage :src="novel.cover_url" :alt="novel.title" :aspectRatio="useCoverConfig().novelAspectRatio" />
    <div class="p-3 space-y-1.5">
      <!-- Title -->
      <h3 class="text-white font-bold text-sm truncate" :title="primaryTitle + (secondaryTitle ? ' / ' + secondaryTitle : '')">
        {{ primaryTitle }}<span v-if="secondaryTitle" class="text-gray-500 font-normal"> / {{ secondaryTitle }}</span>
      </h3>

      <!-- Author + Series -->
      <p class="text-gray-500 text-xs truncate h-4">
        <template v-if="primaryAuthor">{{ primaryAuthor }}</template>
        <template v-if="novel.series">
          <span v-if="primaryAuthor"> · </span>
          <span class="text-indigo-400/70">{{ novel.series }}</span>
        </template>
      </p>

      <!-- Rating + Status -->
      <div class="flex items-center justify-between">
        <RatingDisplay :rating="novel.rating" size="sm" />
        <StatusBadge :status="novel.status" />
      </div>

      <!-- Tags -->
      <TagList :tags="novel.tags" :max="3" />

      <!-- Short review -->
      <p v-if="shortReview" class="text-gray-500 text-xs italic leading-tight line-clamp-1">
        {{ shortReview }}
      </p>
    </div>
  </NuxtLink>
</template>
