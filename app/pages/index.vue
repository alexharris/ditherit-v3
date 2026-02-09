<script setup lang="ts">
import { DIFFUSION_ALGORITHMS, loadImage } from '~/composables/useDithering'
import { BAYER_SIZES } from '~/utils/dithering'
import type { GalleryImage } from '~/composables/useImageGallery'
import defaultImageUrl from '~/assets/examples/quantfrog.png'

const {
  isProcessing,
  ditherMode,
  algorithm,
  serpentine,
  pixeliness,
  pixelScale,
  bayerSize,
  palette,
  analyzePalette,
  dither,
  invalidateQuantCache
} = useDithering()

const {
  images,
  selectedImage,
  hasImages,
  processedCount,
  isDownloadingAll,
  addImages,
  addImageFromUrl,
  selectImage,
  removeImage,
  clearAll,
  setDitheredResult,
  setResizedOriginal,
  setProcessing,
  clearDitheredResults,
  downloadAll
} = useImageGallery()

const {
  paletteColors,
  customPalettes,
  selectedPreset,
  isCustomPaletteSelected,
  paletteAsRgb,
  setPaletteFromRgb,
  updateOriginalPalette,
  setColorAt,
  addColor,
  removeColor,
  selectPreset,
  saveCurrentPalette,
  deleteCustomPalette,
  importFromJson
} = usePalette()

const toast = useToast()

const fileInputRef = ref<HTMLInputElement>()
const canvasRef = ref<HTMLCanvasElement>()

const isDefaultImage = computed(() => images.value.length === 1 && images.value[0].fileName === 'quantfrog.png')

const isDragging = ref(false)
const isIntro = ref(true)
const showCompare = ref(false)
const drawerMode = ref(false)
const drawerPalette = ref(false)
const drawerScale = ref(false)

const ditherModes = [
  { label: 'Error Diffusion', value: 'diffusion' },
  { label: 'Bayer (Ordered)', value: 'bayer' }
]

// Image sizing state (managed by ImageSizeControl, synced via events)
const originalWidth = ref(0)
const originalHeight = ref(0)
const sizeWidth = ref<number | undefined>(undefined)
const sizeValid = ref(true)

function handleSizeChange(payload: { width: number | undefined; valid: boolean }) {
  sizeWidth.value = payload.width
  sizeValid.value = payload.valid
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function handleDragLeave(e: DragEvent) {
  const main = e.currentTarget as HTMLElement
  if (e.relatedTarget && main.contains(e.relatedTarget as Node)) return
  isDragging.value = false
}

function warnRejectedFiles(rejected: { tooLarge: string[]; tooWide: string[] }) {
  if (rejected.tooLarge.length > 0) {
    toast.add({
      title: 'File too large',
      description: `${rejected.tooLarge.join(', ')} exceeded the 2.5 MB limit and was not added.`,
      color: 'error'
    })
  }
  if (rejected.tooWide.length > 0) {
    toast.add({
      title: 'Image too large',
      description: `${rejected.tooWide.join(', ')} exceeds 4000px and was not added.`,
      color: 'error'
    })
  }
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    const wasIntro = isIntro.value
    const oldIds = wasIntro ? images.value.map(img => img.id) : []
    const result = await addImages(files)
    if (wasIntro && result.added > 0) {
      isIntro.value = false
      oldIds.forEach(id => removeImage(id))
    }
    warnRejectedFiles(result)
  }
}

async function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const wasIntro = isIntro.value
    const oldIds = wasIntro ? images.value.map(img => img.id) : []
    const result = await addImages(target.files)
    if (wasIntro && result.added > 0) {
      isIntro.value = false
      oldIds.forEach(id => removeImage(id))
    }
    warnRejectedFiles(result)
    // Reset input so same file can be selected again
    target.value = ''
  }
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

// Process a single image — uses cached image loading
async function processImageForDither(image: GalleryImage, width?: number): Promise<{ url: string; blob: Blob }> {
  const img = await loadImage(image.originalSrc)
  const canvas = canvasRef.value
  if (!canvas) throw new Error('Canvas not available')
  const result = await dither(img, canvas, width)
  return { url: result.url, blob: result.blob }
}

function generateResizedOriginal(image: GalleryImage, width: number): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use cached image loading for resized original too
    loadImage(image.originalSrc).then((img) => {
      const canvas = document.createElement('canvas')
      const height = (img.naturalHeight / img.naturalWidth) * width
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/png'))
    }).catch(reject)
  })
}

async function handleDither() {
  if (!selectedImage.value || !canvasRef.value || !sizeValid.value) return

  setProcessing(selectedImage.value.id, true)
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

  try {
    const width = sizeWidth.value
    const result = await processImageForDither(selectedImage.value, width)
    setDitheredResult(selectedImage.value.id, result.url, result.blob)

    if (width) {
      const resized = await generateResizedOriginal(selectedImage.value, width)
      setResizedOriginal(selectedImage.value.id, resized)
    } else {
      setResizedOriginal(selectedImage.value.id, null)
    }
  } finally {
    setProcessing(selectedImage.value.id, false)
  }
}

let ditherTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedDither() {
  if (ditherTimeout) clearTimeout(ditherTimeout)
  ditherTimeout = setTimeout(() => handleDither(), 300)
}

function downloadSingleImage() {
  if (!selectedImage.value?.ditheredBlob) return
  const url = URL.createObjectURL(selectedImage.value.ditheredBlob)
  const link = document.createElement('a')
  const baseName = selectedImage.value.fileName.replace(/\.[^.]+$/, '')
  link.download = `${baseName}-dithered.png`
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

async function handleDownload() {
  if (images.value.length > 1) {
    await downloadAll(processImageForDither)
  } else {
    downloadSingleImage()
  }
}

// Load default image on startup (auto-dither triggers via settings watcher)
onMounted(() => {
  if (!hasImages.value) {
    addImageFromUrl(defaultImageUrl, 'quantfrog.png')
  }
})

// Reload the frog when the last image is removed
watch(hasImages, (has) => {
  if (!has) {
    isIntro.value = true
    addImageFromUrl(defaultImageUrl, 'quantfrog.png')
  }
})

// Update palette and dimensions when selected image changes
watch(selectedImage, async (newImage) => {
  if (newImage) {
    const img = await loadImage(newImage.originalSrc)

    // Capture original dimensions (passed as props to ImageSizeControl)
    originalWidth.value = img.naturalWidth
    originalHeight.value = img.naturalHeight

    invalidateQuantCache()
    const colors = analyzePalette(img)

    // Always store the analyzed palette so "Original" reflects this image
    updateOriginalPalette(colors)

    if (selectedPreset.value === 'original') {
      // Use the image's own analyzed palette
      palette.value = colors
      setPaletteFromRgb(colors)
      // Auto-dither triggers via paletteAsRgb watcher
    } else {
      // Keep current preset/custom palette, just re-dither with new image
      debouncedDither()
    }
  }
}, { immediate: true })

// Sync palette editor changes to dithering palette
watch(paletteAsRgb, (newPalette) => {
  if (newPalette.length > 0) {
    palette.value = newPalette
  }
}, { deep: true })

// Auto-dither selected image when any setting changes
watch([ditherMode, algorithm, serpentine, pixeliness, pixelScale, bayerSize, paletteAsRgb, sizeWidth], () => {
  if (selectedImage.value && sizeValid.value) {
    debouncedDither()
  }
}, { deep: true })

// Clear dithered results when settings change (for non-selected images)
watch([ditherMode, algorithm, serpentine, pixeliness, pixelScale, bayerSize, paletteAsRgb], () => {
  // Mark other images as needing re-processing
  // Note: width changes only affect the selected image, so we don't include it here
  images.value.forEach((img) => {
    if (img.id !== selectedImage.value?.id) {
      if (img.ditheredDataUrl) {
        URL.revokeObjectURL(img.ditheredDataUrl)
      }
      img.ditheredDataUrl = null
      img.ditheredBlob = null
      img.ditheredFileSize = null
    }
  })
}, { deep: true })
</script>

<template>
  <div class="flex h-dvh flex-col bg-gray-100 dark:bg-gray-900 bg-grid">
    <!-- Hidden file input (multiple) -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="handleFileSelect"
    />

    <!-- Hidden canvas for dithering -->
    <canvas ref="canvasRef" class="hidden" />

    <!-- Top Bar -->
    <AppHeader />

    <!-- Mobile Drawers -->
    <UDrawer v-model:open="drawerMode" :overlay="false">
      <template #body>
        <div class="space-y-4 px-4 py-4">
          <HelpTooltip>
            <template #label>
              <span class="text-sm font-medium text-highlighted">Dither Mode</span>
            </template>
            <template #help>
              These methods are different ways to spread around the quantization
              error introduced by reducing an image's color palette. They look quite
              different, try them out!
            </template>
            <URadioGroup v-model="ditherMode" :items="ditherModes" class="mt-2" />
          </HelpTooltip>

          <USelect
            v-if="ditherMode === 'diffusion'"
            v-model="algorithm"
            :items="DIFFUSION_ALGORITHMS"
            class="w-full"
          />

          <USelect
            v-if="ditherMode === 'bayer'"
            v-model="bayerSize"
            :items="BAYER_SIZES"
            class="w-full"
          />

          <HelpTooltip v-if="ditherMode === 'diffusion'">
            <template #label>
              <UCheckbox
                v-model="serpentine"
                label="Serpentine"
              />
            </template>
            <template #help>
              This determines if the dithering just goes left to right, top to
              bottom, or does a snake wiggle.
            </template>
          </HelpTooltip>
        </div>
      </template>
    </UDrawer>

    <UDrawer v-model:open="drawerPalette" :overlay="false">
      <template #body>
        <div class="px-4 py-4">
          <HelpTooltip>
            <template #label>
              <span class="text-sm font-medium text-highlighted">Palette</span>
            </template>
            <template #help>
              The color palette used for dithering. Choose a preset, edit individual
              colors, or create and save your own custom palettes.
            </template>
            <PaletteEditor
              :palette="paletteColors"
              :custom-palettes="customPalettes"
              :selected-preset="selectedPreset"
              :is-custom-palette-selected="isCustomPaletteSelected"
              class="mt-2"
              @select-preset="selectPreset"
              @set-color="setColorAt"
              @add-color="addColor"
              @remove-color="removeColor"
              @save-custom="saveCurrentPalette"
              @delete-custom="deleteCustomPalette"
              @import="importFromJson"
            />
          </HelpTooltip>
        </div>
      </template>
    </UDrawer>

    <UDrawer v-model:open="drawerScale" :overlay="false">
      <template #body>
        <div class="px-4 py-4">
          <HelpTooltip>
            <template #label>
              <span class="text-sm font-medium text-highlighted">Pixel Scale</span>
            </template>
            <template #help>
              Dithers at a reduced resolution then upscales with nearest-neighbor
              interpolation, producing coherent chunky pixels with uniform color blocks.
            </template>
            <div class="mt-2">
              <USlider v-model="pixelScale" :min="1" :max="25" :step="1" />
              <span class="text-xs text-gray-500">{{ pixelScale }}x</span>
            </div>
          </HelpTooltip>
        </div>
      </template>
    </UDrawer>

    <!-- Body below top bar -->
    <div class="flex flex-1 flex-col lg:flex-row overflow-hidden">

    <!-- Sidebar (desktop only) -->
    <aside
      class="hidden lg:flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
    >
      <SidebarContent />

      <!-- Sidebar Footer -->
      <div
        class="flex shrink-0 items-center border-t border-gray-200 p-4 dark:border-gray-800"
      >
        <span class="text-sm text-gray-500 dark:text-gray-400">v3</span>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Content area -->
      <div class="relative flex flex-1 overflow-hidden">
        <!-- Main Content Area (drag-and-drop zone) -->
        <main
          class="relative flex flex-1 flex-col overflow-hidden "
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
        >
          <!-- Drag overlay -->
          <div
            v-if="isDragging"
            class="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-red-500/10 ring-4 ring-inset ring-red-500"
          >
            <div class="rounded-xl bg-white/90 px-8 py-6 text-center shadow-lg dark:bg-gray-900/90">
              <UIcon name="i-lucide-image-plus" class="mx-auto size-12 text-red-500" />
              <p class="mt-2 text-lg font-medium text-gray-700 dark:text-gray-200">
                Drop images to add
              </p>
            </div>
          </div>

          <!-- Preview Area -->
          <div
            class="relative flex flex-1 flex-col items-center justify-center overflow-auto p-3 lg:p-8 [scrollbar-gutter:stable]"
            :class="isIntro ? 'border-2 border-dashed border-gray-300 m-2 lg:m-4 dark:border-gray-600' : ''"
          >
            <!-- Intro upload hint -->
            <div v-if="isIntro" class="absolute left-0 right-0 top-16 lg:top-24 flex items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>Drop your own images here or</span>
              <UButton
                icon="i-lucide-upload"
                label="Upload"
                size="xs"
                color="neutral"
                variant="outline"
                @click="triggerFileInput"
              />
            </div>

            <!-- Selected Image Display -->
            <div
              v-if="selectedImage"
              class="flex flex-col items-center gap-4"
            >
              <div class="relative">
                <template v-if="selectedImage.ditheredDataUrl">
                  <!-- Comparison slider -->
                  <ImageCompare
                    v-show="showCompare"
                    :original-src="selectedImage.resizedOriginalSrc || selectedImage.originalSrc"
                    :dithered-src="selectedImage.ditheredDataUrl"
                    :alt="selectedImage.fileName"
                    class="max-h-[60vh] max-w-full"
                  />

                  <!-- Dithered only -->
                  <img
                    v-show="!showCompare"
                    :src="selectedImage.ditheredDataUrl"
                    :alt="selectedImage.fileName"
                    class="max-h-[60vh] max-w-full no-touch-callout"
                  />
                </template>

                <!-- Original only (when not dithered) -->
                <img
                  v-else
                  :src="selectedImage.originalSrc"
                  :alt="selectedImage.fileName"
                  class="max-h-[60vh] max-w-full no-touch-callout"
                />

                <!-- Processing overlay -->
                <div
                  v-if="selectedImage.isProcessing"
                  class="absolute inset-0 flex items-center justify-center bg-black/30"
                >
                  <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-red-500" />
                </div>
              </div>

              <!-- Image toolbar -->
              <div
                class="mt-3 flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <ImageSizeControl
                  v-if="originalWidth > 0"
                  :original-width="originalWidth"
                  :original-height="originalHeight"
                  @change="handleSizeChange"
                />
                <div class="flex-1" />
                <UButton
                  icon="i-lucide-columns-2"
                  :color="showCompare ? 'primary' : 'neutral'"
                  :variant="showCompare ? 'soft' : 'ghost'"
                  size="xs"
                  :disabled="!selectedImage.ditheredDataUrl"
                  @click="showCompare = !showCompare"
                >
                  <span class="hidden lg:inline">Compare</span>
                </UButton>
                <UButton
                  icon="i-lucide-download"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :disabled="!selectedImage.ditheredDataUrl"
                  @click="downloadSingleImage"
                >
                  <span class="hidden lg:inline">Download</span>
                </UButton>
                <UButton
                  v-if="!isDefaultImage"
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  @click="removeImage(selectedImage.id)"
                >
                  <span class="hidden lg:inline">Remove</span>
                </UButton>
              </div>

            </div>
          </div>
        </main>

        <!-- Right Sidebar (desktop only) -->
        <aside class="hidden lg:block w-48 shrink-0 overflow-y-auto p-4">
          <div
            v-if="selectedImage"
            class="rounded-xl border border-gray-200 bg-white/90 p-4 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-950/90"
          >
            <FileSizeReport
              :original-size="selectedImage.originalFileSize"
              :dithered-file-size="selectedImage.ditheredFileSize"
              :file-name="selectedImage.fileName"
              class="w-full"
            />
          </div>
        </aside>
      </div>

      <!-- Bottom Bar (thumbnails + actions) -->
      <footer
        class="flex shrink-0 flex-col lg:flex-row items-stretch lg:items-center gap-2 border-t border-gray-200 bg-white px-3 py-3 lg:px-4 lg:py-4 dark:border-gray-800 dark:bg-gray-950"
      >
        <!-- Image Thumbnails + mobile download -->
        <div v-if="hasImages" class="flex min-w-0 items-center justify-between gap-2">
          <div
            class="flex min-w-0 items-center gap-2 rounded-lg bg-gray-100 px-2 py-2 ring-1 ring-gray-200 ring-inset dark:bg-gray-900 dark:ring-gray-800"
          >
            <ImageThumbnailStrip
              :images="images"
              :selected-id="selectedImage?.id"
              @select="selectImage"
              @remove="removeImage"
              @add="triggerFileInput"
            />
            <button
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-500 dark:border-gray-600 dark:hover:border-gray-500"
              @click="triggerFileInput"
            >
              <UIcon name="i-lucide-plus" class="size-5" />
            </button>
          </div>
          <UButton
            icon="i-lucide-download"
            color="primary"
            variant="outline"
            size="sm"
            class="lg:hidden shrink-0"
            :loading="isDownloadingAll"
            :disabled="!selectedImage?.ditheredDataUrl"
            @click="handleDownload"
          />
        </div>
        <div class="hidden lg:block flex-1" />

        <!-- Action buttons (desktop only) -->
        <div class="hidden lg:flex shrink-0 items-center justify-end gap-2">
          <UButton
            v-if="images.length > 0 && !isDefaultImage"
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="clearAll"
          >
            <span>Clear All</span>
          </UButton>
          <UButton
            icon="i-lucide-download"
            color="primary"
            variant="outline"
            size="sm"
            :loading="isDownloadingAll"
            :disabled="!selectedImage?.ditheredDataUrl"
            @click="handleDownload"
          >
            <span>{{ images.length > 1 ? 'Download All' : 'Download' }}</span>
          </UButton>
        </div>
      </footer>

      <!-- Mobile Bottom Toolbar -->
      <div class="flex lg:hidden shrink-0 items-center justify-around border-t border-gray-200 bg-white py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:border-gray-800 dark:bg-gray-950">
        <button class="flex flex-col items-center gap-1 text-xs text-gray-600 dark:text-gray-400" @click="drawerMode = true">
          <UIcon name="i-lucide-grid-2x2" class="size-6" />
          <span>Mode</span>
        </button>
        <button class="flex flex-col items-center gap-1 text-xs text-gray-600 dark:text-gray-400" @click="drawerPalette = true">
          <UIcon name="i-lucide-palette" class="size-6" />
          <span>Palette</span>
        </button>
        <button class="flex flex-col items-center gap-1 text-xs text-gray-600 dark:text-gray-400" @click="drawerScale = true">
          <UIcon name="i-lucide-maximize" class="size-6" />
          <span>Scale</span>
        </button>
      </div>
    </div>

    </div>
  </div>
</template>
