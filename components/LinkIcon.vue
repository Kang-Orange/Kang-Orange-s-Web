<script setup lang="ts">
const props = defineProps<{
  url: string
  icon?: string
}>()

// Ordered fallback: user-selected icon → generic link icon
const sources: string[] = [
  ...(props.icon ? [`/icons/links/${props.icon}.svg`] : []),
  '/icons/links/link.svg',
]

const sourceIndex = ref(0)
const currentSrc = computed(() => sources[sourceIndex.value])

function onError() {
  if (sourceIndex.value < sources.length - 1) {
    sourceIndex.value++
  }
}
</script>

<template>
  <img
    :src="currentSrc"
    :alt="props.icon || 'link'"
    class="w-5 h-5 flex-shrink-0 rounded-sm"
    @error="onError"
  />
</template>
