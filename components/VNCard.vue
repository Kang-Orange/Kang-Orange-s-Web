<script setup lang="ts">
import type { VNEntry } from '~/composables/useVNData'

const props = defineProps<{
  vn: VNEntry
}>()

const shortReview = computed(() => {
  const text = props.vn.review || props.vn.summary
  if (!text) return ''
  return text.length > 50 ? text.slice(0, 50) + '…' : text
})

const primaryTitle = computed(() => props.vn.title?.trim() || props.vn.original_title?.trim() || '(无标题)')
const secondaryTitle = computed(() => {
  if (props.vn.title?.trim() && props.vn.original_title?.trim()) return props.vn.original_title
  return null
})
</script>

<template>
  <NuxtLink
    :to="'/vn/' + vn.id"
    class="group block bg-gray-800 rounded-lg overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-indigo-500/10"
  >
    <CoverImage :src="vn.cover_url" :alt="vn.title" :type="vn.game_type" />
    <div class="p-3 space-y-1.5">
      <!-- Title: 译名 / 原名 -->
      <h3 class="text-white font-bold text-sm truncate" :title="primaryTitle + (secondaryTitle ? ' / ' + secondaryTitle : '')">
        {{ primaryTitle }}<span v-if="secondaryTitle" class="text-gray-500 font-normal"> / {{ secondaryTitle }}</span>
      </h3>

      <!-- Developer -->
      <p class="text-gray-500 text-xs truncate h-4">{{ vn.developer || '' }}</p>

      <!-- Rating + Status -->
      <div class="flex items-center justify-between">
        <RatingDisplay :rating="vn.rating" size="sm" />
        <div class="flex items-center gap-1">
          <span v-if="vn.dev_status && vn.dev_status !== '已发布'" class="text-[11px] px-1.5 py-0.5 rounded font-bold border"
            :class="vn.dev_status === '开发中' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-stone-500/20 text-stone-300 border-stone-500/30'">
            {{ vn.dev_status }}
          </span>
          <StatusBadge :status="vn.status" />
        </div>
      </div>

      <!-- Tags -->
      <TagList :tags="vn.tags" :max="3" />

      <!-- Short review -->
      <p v-if="shortReview" class="text-gray-500 text-xs italic leading-tight line-clamp-1">
        {{ shortReview }}
      </p>
    </div>
  </NuxtLink>
</template>
