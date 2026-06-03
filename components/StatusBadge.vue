<script setup lang="ts">
defineProps<{
  status: 'completed' | 'playing' | 'plan_to_play' | 'dropped' | 'reading' | 'plan_to_read'
}>()

const labelMap: Record<string, string> = {
  completed: '已完成',
  playing: '游玩中',
  plan_to_play: '计划中',
  dropped: '已弃坑',
  reading: '阅读中',
  plan_to_read: '想读',
}

const styleMap: Record<string, string> = {
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  playing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  plan_to_play: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  dropped: 'bg-red-500/20 text-red-400 border-red-500/30'
}
</script>

<template>
  <span
    class="text-[11px] px-1.5 py-0.5 rounded border font-bold"
    :class="styleMap[status]"
  >
    {{ labelMap[status] }}
  </span>
</template>
