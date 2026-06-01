<script setup lang="ts">
import Cropper, { CropperSelection, CropperCanvas, CropperImage } from 'cropperjs'
import { COVER_CONFIG } from '~/composables/useCoverConfig'

// Custom template:
// - No "select" handle → prevents click-drag from creating a new crop area.
// - Canvas-level "move" handle (plain, before selection) catches clicks outside
//   the crop box so CropperImage can pan the image underneath.
// - Selection-level "move" handle (inside selection) controls crop-box dragging.
const CROP_TEMPLATE = `
<cropper-canvas>
  <cropper-image rotatable scalable translatable></cropper-image>
  <cropper-shade hidden></cropper-shade>
  <cropper-handle action="move" plain></cropper-handle>
  <cropper-selection initial-coverage="0.8" movable resizable>
    <cropper-grid bordered covered></cropper-grid>
    <cropper-crosshair centered></cropper-crosshair>
    <cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)"></cropper-handle>
    <cropper-handle action="n-resize"></cropper-handle>
    <cropper-handle action="e-resize"></cropper-handle>
    <cropper-handle action="s-resize"></cropper-handle>
    <cropper-handle action="w-resize"></cropper-handle>
    <cropper-handle action="ne-resize"></cropper-handle>
    <cropper-handle action="nw-resize"></cropper-handle>
    <cropper-handle action="se-resize"></cropper-handle>
    <cropper-handle action="sw-resize"></cropper-handle>
  </cropper-selection>
</cropper-canvas>`

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

const imgRef = ref<HTMLImageElement | null>(null)
let cropper: Cropper | null = null
let cropperSelection: CropperSelection | null = null
let cropperCanvas: CropperCanvas | null = null
let cropperImage: CropperImage | null = null
let onSelectionChange: ((e: Event) => void) | null = null
let onActionEnd: (() => void) | null = null

/**
 * Compute the clamped position for the crop box so it never extends
 * outside the image bounds. Returns null if no clamping is needed.
 *
 * When `proposed` is provided, uses those as the candidate values
 * (for 'change' events where the new position hasn't been written yet).
 * Otherwise reads the current values from the selection (for 'actionend').
 */
function computeClamped(proposed?: { x: number; y: number; width: number; height: number }) {
  if (!cropperSelection || !cropperImage || !cropperCanvas) return null

  const imgRect = cropperImage.getBoundingClientRect()
  const canvasRect = cropperCanvas.getBoundingClientRect()

  // Image bounds in canvas-local coordinates
  const imgLeft = imgRect.left - canvasRect.left
  const imgTop = imgRect.top - canvasRect.top
  const imgRight = imgLeft + imgRect.width
  const imgBottom = imgTop + imgRect.height

  // Use proposed values if available (change event), else current values (actionend)
  let cx: number, cy: number, cw: number, ch: number
  if (proposed) {
    cx = proposed.x; cy = proposed.y; cw = proposed.width; ch = proposed.height
  } else {
    cx = cropperSelection.x; cy = cropperSelection.y
    cw = cropperSelection.width; ch = cropperSelection.height
  }

  let clampedX = cx
  let clampedY = cy
  let clampedW = cw
  let clampedH = ch

  // Clamp left edge
  if (clampedX < imgLeft) clampedX = imgLeft
  // Clamp top edge
  if (clampedY < imgTop) clampedY = imgTop
  // Clamp right edge (if image narrower than selection, shrink to image width)
  if (clampedX + clampedW > imgRight) {
    if (imgRight - imgLeft >= clampedW) {
      clampedX = imgRight - clampedW
    } else {
      clampedW = imgRight - imgLeft
      clampedX = imgLeft
    }
  }
  // Clamp bottom edge
  if (clampedY + clampedH > imgBottom) {
    if (imgBottom - imgTop >= clampedH) {
      clampedY = imgBottom - clampedH
    } else {
      clampedH = imgBottom - imgTop
      clampedY = imgTop
    }
  }

  if (clampedX !== cx || clampedY !== cy || clampedW !== cw || clampedH !== ch) {
    return { x: clampedX, y: clampedY, width: clampedW, height: clampedH }
  }
  return null
}

/**
 * Handler for the 'change' event inside the canvas shadow DOM.
 * Uses the PROPOSED values from event.detail because $change emits
 * the event BEFORE writing the new position to the element.
 */
function handleSelectionChange(event: Event) {
  const detail = (event as CustomEvent).detail as {
    x: number; y: number; width: number; height: number
  }
  const clamped = computeClamped(detail)
  if (!clamped) return

  // Reject the out-of-bounds change — selection stays at last valid position
  event.preventDefault()
  // $changing flag is true synchronously → defer to next task
  setTimeout(() => {
    cropperSelection?.$change(clamped.x, clamped.y, clamped.width, clamped.height)
  }, 0)
}

/**
 * Handler for 'actionend' on the canvas host element.
 * After image panning (or any interaction), re-clamp if the selection
 * now extends outside the moved image. Reads current values.
 */
function handleActionEnd() {
  const clamped = computeClamped()
  if (clamped) {
    cropperSelection?.$change(clamped.x, clamped.y, clamped.width, clamped.height)
  }
}

onMounted(() => {
  if (!imgRef.value) return

  cropper = new Cropper(imgRef.value, {
    template: CROP_TEMPLATE,
  })

  // Crop box behavior
  cropperSelection = cropper.getCropperSelection()
  if (cropperSelection) {
    cropperSelection.aspectRatio = props.aspectRatio
    cropperSelection.movable = true
    cropperSelection.resizable = true
    cropperSelection.zoomable = true
  }

  // Canvas sizing & zoom step
  cropperCanvas = cropper.getCropperCanvas()
  if (cropperCanvas) {
    cropperCanvas.background = false
    cropperCanvas.scaleStep = 0.25

    // Hook into the shadow root to clamp selection within image bounds.
    // The 'change' event has composed=false by default → doesn't cross shadow boundary.
    onSelectionChange = handleSelectionChange
    cropperCanvas.shadowRoot?.addEventListener('change', onSelectionChange)

    // Also clamp after any interaction ends (e.g. image panning may
    // have moved the image out from under the selection).
    // 'actionend' fires on the host element (light DOM), not shadow.
    onActionEnd = handleActionEnd
    cropperCanvas.addEventListener('actionend', onActionEnd)
  }

  // Image panning (drag outside crop box → move image)
  cropperImage = cropper.getCropperImage()
  if (cropperImage) {
    cropperImage.translatable = true
  }

  // Re-center the image after the canvas has its final layout size.
  // Without this the image may be scaled based on the canvas's min-size (200x100)
  // and appear as a tiny strip.
  nextTick(() => {
    cropperImage?.$center('contain')
  })
})

onBeforeUnmount(() => {
  if (cropperCanvas?.shadowRoot && onSelectionChange) {
    cropperCanvas.shadowRoot.removeEventListener('change', onSelectionChange)
    onSelectionChange = null
  }
  if (cropperCanvas && onActionEnd) {
    cropperCanvas.removeEventListener('actionend', onActionEnd)
    onActionEnd = null
  }
  cropper?.destroy()
  cropper = null
  cropperSelection = null
  cropperCanvas = null
  cropperImage = null
})

function zoomIn() {
  cropperImage?.$zoom(0.25)
}

function zoomOut() {
  cropperImage?.$zoom(-0.25)
}

async function confirm() {
  if (!cropperSelection) return
  const naturalWidth = cropperSelection.width
  const outputWidth = Math.min(naturalWidth, props.maxWidth)
  const canvas = await cropperSelection.$toCanvas({ width: outputWidth })
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
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      @wheel.prevent
    >
      <div class="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h2 class="text-white font-semibold">Crop Image</h2>
          <span class="text-xs text-gray-500">Scroll to zoom &middot; Drag to position</span>
        </div>

        <!-- Cropper area -->
        <div class="crop-area flex-1 overflow-hidden bg-gray-950 relative" style="min-height: 350px; max-height: 55vh;">
          <img ref="imgRef" :src="src" alt="Crop preview" style="display: none;" />
        </div>

        <!-- Footer -->
        <div class="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
          <!-- Zoom controls -->
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

          <!-- Actions -->
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

<style>
/* v2 root element fills the crop-area via absolute positioning */
.crop-area cropper-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: block;
}
</style>
