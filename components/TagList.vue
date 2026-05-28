<script setup lang="ts">
const props = withDefaults(defineProps<{
  tags: string[]
  max?: number
}>(), { max: 3 })
</script>

<template>
  <div class="flex flex-wrap gap-1.5">
    <span
      v-for="tag in tags.slice(0, props.max)"
      :key="tag"
      class="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full"
    >
      {{ tag }}
    </span>
    <span
      v-if="tags.length > props.max"
      class="text-gray-500 text-xs"
    >
      +{{ tags.length - props.max }}
    </span>
  </div>
</template>
