<script setup lang="ts">
defineProps<{
  status: 'completed' | 'playing' | 'plan_to_play' | 'dropped'
}>()

const labelMap: Record<string, string> = {
  completed: '已完成',
  playing: '游玩中',
  plan_to_play: '计划中',
  dropped: '已弃坑'
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
    class="text-xs px-2 py-0.5 rounded border"
    :class="styleMap[status]"
  >
    {{ labelMap[status] }}
  </span>
</template>
