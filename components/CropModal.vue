<script setup lang="ts">
/**
 * CropModal — image cropping with a fixed centered crop window.
 *
 * Interaction model:
 * - Crop window: fixed position, fixed aspect ratio, centered in the container.
 * - Image: draggable (pointer) and zoomable (wheel / +/- buttons).
 * - Boundary: image edges can never enter the crop window (no black areas).
 *
 * No external dependencies — pure CSS + Canvas API.
 */
import { COVER_CONFIG } from '~/composables/useCoverConfig'

const props = withDefaults(defineProps<{
  src: string
  aspectRatio?: number
  maxWidth?: number
  quality?: number
}>(), {
  aspectRatio: COVER_CONFIG.aspectRatio,
  maxWidth: COVER_CONFIG.maxWidth,
  quality: COVER_CONFIG.quality,
})

const emit = defineEmits<{
  crop: [blob: Blob]
  cancel: []
}>()

// ── Refs ──────────────────────────────────────────────
const containerRef = ref<HTMLDivElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)

const containerW = ref(0)
const containerH = ref(0)

const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const minScale = ref(1)
const initialized = ref(false)

// ── Crop window geometry (computed from container + aspect ratio) ──
const WINDOW_RATIO = 0.9 // window occupies 90% of the container in the fitting dimension

const win = computed(() => {
  const cw = containerW.value
  const ch = containerH.value
  const ratio = props.aspectRatio

  let winW: number, winH: number
  if (cw / ch > ratio) {
    // Container is wider than crop ratio — use full height
    winH = ch * WINDOW_RATIO
    winW = winH * ratio
  } else {
    // Container is taller than crop ratio — use full width
    winW = cw * WINDOW_RATIO
    winH = winW / ratio
  }

  return {
    width: winW,
    height: winH,
    left: (cw - winW) / 2,
    top: (ch - winH) / 2,
  }
})

// ── Image style (driven by offset/scale state) ──
const imageStyle = computed(() => ({
  position: 'absolute' as const,
  left: '0px',
  top: '0px',
  width: 'auto',
  height: 'auto',
  maxWidth: 'none',
  maxHeight: 'none',
  transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value})`,
  transformOrigin: '0 0',
  pointerEvents: 'none' as const,
}))

// ── Window style ──
const windowStyle = computed(() => ({
  position: 'absolute' as const,
  left: `${win.value.left}px`,
  top: `${win.value.top}px`,
  width: `${win.value.width}px`,
  height: `${win.value.height}px`,
  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
  outline: '2px solid rgba(255, 255, 255, 0.5)',
  outlineOffset: '-1px',
  pointerEvents: 'none' as const,
}))

// ── Initialization ────────────────────────────────────
function tryInit() {
  if (initialized.value) return
  const img = imageRef.value
  if (!img || !img.naturalWidth) return
  if (containerW.value === 0 || containerH.value === 0) return

  const natW = img.naturalWidth
  const natH = img.naturalHeight
  const w = win.value

  // Scale so image just covers the crop window
  const coverScale = Math.max(w.width / natW, w.height / natH)
  minScale.value = coverScale
  scale.value = coverScale

  // Center image on the crop window
  const imgW = natW * coverScale
  const imgH = natH * coverScale
  offsetX.value = w.left + (w.width - imgW) / 2
  offsetY.value = w.top + (w.height - imgH) / 2

  initialized.value = true
}

function onImageLoad() {
  tryInit()
}

// ── ResizeObserver ────────────────────────────────────
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0].contentRect
    containerW.value = rect.width
    containerH.value = rect.height
    tryInit()
  })
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

// ── Boundary clamping ─────────────────────────────────
// Ensure crop window stays fully within image bounds.
function clamp() {
  const img = imageRef.value
  if (!img) return

  const natW = img.naturalWidth
  const natH = img.naturalHeight
  const imgW = natW * scale.value
  const imgH = natH * scale.value
  const w = win.value

  // Image must cover the crop window:
  //   offsetX <= w.left          (image left ≤ window left)
  //   offsetX + imgW >= w.right   (image right ≥ window right)
  // Same for Y.
  const minX = w.left + w.width - imgW  // right constraint
  const maxX = w.left                     // left constraint
  const minY = w.top + w.height - imgH
  const maxY = w.top

  offsetX.value = Math.min(maxX, Math.max(minX, offsetX.value))
  offsetY.value = Math.min(maxY, Math.max(minY, offsetY.value))
}

// ── Zoom ──────────────────────────────────────────────
function zoom(factor: number, cx?: number, cy?: number) {
  const w = win.value
  const zoomCX = cx ?? (w.left + w.width / 2)
  const zoomCY = cy ?? (w.top + w.height / 2)

  const newScale = Math.max(minScale.value, Math.min(scale.value * factor, 5))
  if (newScale === scale.value) return

  // Keep the point (zoomCX, zoomCY) fixed on the same image pixel
  offsetX.value = zoomCX - (zoomCX - offsetX.value) * (newScale / scale.value)
  offsetY.value = zoomCY - (zoomCY - offsetY.value) * (newScale / scale.value)
  scale.value = newScale
  clamp()
}

function zoomIn() { zoom(1.25) }
function zoomOut() { zoom(0.8) } // 1/1.25 — cancels out with zoomIn

// ── Drag ──────────────────────────────────────────────
let dragging = false
let dragStartX = 0
let dragStartY = 0
let dragStartOffX = 0
let dragStartOffY = 0

function onPointerDown(e: PointerEvent) {
  dragging = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragStartOffX = offsetX.value
  dragStartOffY = offsetY.value
  containerRef.value?.setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging) return
  offsetX.value = dragStartOffX + (e.clientX - dragStartX)
  offsetY.value = dragStartOffY + (e.clientY - dragStartY)
  clamp()
}

function onPointerUp(_e: PointerEvent) {
  dragging = false
}

// ── Wheel ─────────────────────────────────────────────
function onWheel(e: WheelEvent) {
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return
  const cx = e.clientX - rect.left
  const cy = e.clientY - rect.top
  zoom(e.deltaY < 0 ? 1.08 : 1 / 1.08, cx, cy)
}

// ── Confirm / Cancel ──────────────────────────────────
function confirm() {
  const img = imageRef.value
  if (!img) return

  const w = win.value

  // Map crop window from container coords → image natural coords
  const srcX = (w.left - offsetX.value) / scale.value
  const srcY = (w.top - offsetY.value) / scale.value
  const srcW = w.width / scale.value
  const srcH = w.height / scale.value

  const outputW = Math.min(srcW, props.maxWidth)
  const outputH = outputW / props.aspectRatio

  const canvas = document.createElement('canvas')
  canvas.width = outputW
  canvas.height = outputH
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputW, outputH)

  canvas.toBlob(
    (blob) => {
      if (blob) emit('crop', blob)
    },
    'image/jpeg',
    props.quality,
  )
}

function cancel() {
  emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div class="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h2 class="text-white font-semibold">Crop Cover</h2>
          <span class="text-xs text-gray-500">Drag to position &middot; Scroll to zoom</span>
        </div>

        <!-- Crop area -->
        <div
          ref="containerRef"
          class="crop-area flex-1 overflow-hidden bg-gray-950 relative"
          style="min-height: 350px; max-height: 55vh; touch-action: none; user-select: none;"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointerleave="onPointerUp"
          @wheel.prevent="onWheel"
        >
          <img
            ref="imageRef"
            :src="src"
            :style="imageStyle"
            draggable="false"
            alt="Crop preview"
            @load="onImageLoad"
          />
          <!-- Crop window overlay (visual only, pointer-events: none) -->
          <div :style="windowStyle" />
        </div>

        <!-- Footer -->
        <div class="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
          <div class="flex items-center gap-1">
            <button
              type="button"
              @click="zoomOut"
              class="w-8 h-8 flex items-center justify-center rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-lg transition-colors"
              title="Zoom out"
            >&minus;</button>
            <button
              type="button"
              @click="zoomIn"
              class="w-8 h-8 flex items-center justify-center rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-lg transition-colors"
              title="Zoom in"
            >+</button>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              @click="cancel"
              class="px-4 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >Cancel</button>
            <button
              type="button"
              @click="confirm"
              class="px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
            >Confirm</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
