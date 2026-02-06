<script setup lang="ts">
import { DIFFUSION_ALGORITHMS, loadImage } from '~/composables/useDithering'
import type { GalleryImage } from '~/composables/useImageGallery'
import defaultImageUrl from '~/assets/examples/quantfrog.png'

const {
  isProcessing,
  ditherMode,
  algorithm,
  serpentine,
  pixeliness,
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

const isDragging = ref(false)
const isIntro = ref(true)
const showCompare = ref(false)

// Image sizing state (managed by ImageSizeControl, synced via events)
const originalWidth = ref(0)
const originalHeight = ref(0)
const sizeWidth = ref<number | undefined>(undefined)
const sizeValid = ref(true)

function handleSizeChange(payload: { width: number | undefined; valid: boolean }) {
  sizeWidth.value = payload.width
  sizeValid.value = payload.valid
}

const ditherModes = [
  { label: 'Error Diffusion', value: 'diffusion' },
  { label: 'Bayer (Ordered)', value: 'bayer' }
]

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
      description: `${rejected.tooWide.join(', ')} exceeds 2048px and was not added.`,
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
watch([ditherMode, algorithm, serpentine, pixeliness, paletteAsRgb, sizeWidth], () => {
  if (selectedImage.value && sizeValid.value) {
    debouncedDither()
  }
}, { deep: true })

// Clear dithered results when settings change (for non-selected images)
watch([ditherMode, algorithm, serpentine, pixeliness, paletteAsRgb], () => {
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
  <div class="flex h-screen flex-col bg-gray-100 dark:bg-gray-900 bg-grid">
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

    <!-- Body below top bar -->
    <div class="flex flex-1 overflow-hidden">

    <!-- Sidebar -->
    <aside
      class="flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
    >
      <!-- Sidebar Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <div class="space-y-6">
          <!-- Dither Mode -->
          <UFormField label="Dither Mode">
            <URadioGroup v-model="ditherMode" :items="ditherModes" />
          </UFormField>

          <!-- Algorithm (for diffusion mode) -->
          <UFormField v-if="ditherMode === 'diffusion'" label="Algorithm">
            <USelect
              v-model="algorithm"
              :items="DIFFUSION_ALGORITHMS"
              class="w-full"
            />
          </UFormField>

          <!-- Pixeliness -->
          <UFormField label="Pixeliness">
            <USlider v-model="pixeliness" :min="1" :max="16" :step="1" />
            <template #hint>
              <span class="text-xs text-gray-500">{{ pixeliness }}x</span>
            </template>
          </UFormField>

          <!-- Serpentine (for diffusion) -->
          <UCheckbox
            v-if="ditherMode === 'diffusion'"
            v-model="serpentine"
            label="Serpentine"
          />

          <USeparator />

          <!-- Image Size -->
          <ImageSizeControl
            v-if="originalWidth > 0"
            :original-width="originalWidth"
            :original-height="originalHeight"
            @change="handleSizeChange"
          />

          <USeparator v-if="originalWidth > 0" />

          <!-- Palette Editor -->
          <UFormField label="Palette">
            <PaletteEditor
              :palette="paletteColors"
              :custom-palettes="customPalettes"
              :selected-preset="selectedPreset"
              :is-custom-palette-selected="isCustomPaletteSelected"
              @select-preset="selectPreset"
              @set-color="setColorAt"
              @add-color="addColor"
              @remove-color="removeColor"
              @save-custom="saveCurrentPalette"
              @delete-custom="deleteCustomPalette"
              @import="importFromJson"
            />
          </UFormField>
        </div>
      </div>

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
            class="relative flex flex-1 flex-col items-center justify-center overflow-auto p-8 [scrollbar-gutter:stable]"
            :class="isIntro ? 'border-2 border-dashed border-gray-300 m-4 rounded-lg dark:border-gray-600' : ''"
          >
            <!-- Intro upload hint -->
            <div v-if="isIntro" class="absolute left-0 right-0 top-24 flex items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
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
                    class="max-h-[60vh] max-w-full"
                  />
                </template>

                <!-- Original only (when not dithered) -->
                <img
                  v-else
                  :src="selectedImage.originalSrc"
                  :alt="selectedImage.fileName"
                  class="max-h-[60vh] max-w-full"
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
                class="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                :class="{ 'opacity-40 pointer-events-none': !selectedImage.ditheredDataUrl }"
              >
                <UButton
                  icon="i-lucide-columns-2"
                  label="Compare"
                  :color="showCompare ? 'primary' : 'neutral'"
                  :variant="showCompare ? 'soft' : 'ghost'"
                  size="xs"
                  :disabled="!selectedImage.ditheredDataUrl"
                  @click="showCompare = !showCompare"
                />
                <UButton
                  icon="i-lucide-download"
                  label="Download"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :disabled="!selectedImage.ditheredDataUrl"
                  @click="downloadSingleImage"
                />
              </div>

            </div>
          </div>
        </main>

        <!-- Right Sidebar (always reserves space to prevent layout shift) -->
        <aside class="w-48 shrink-0 overflow-y-auto">
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
        class="flex shrink-0 items-center gap-2 border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950"
      >
        <!-- Image Thumbnails (left) -->
        <ImageThumbnailStrip
          v-if="hasImages"
          :images="images"
          :selected-id="selectedImage?.id"
          @select="selectImage"
          @remove="removeImage"
          @add="triggerFileInput"
        />
        <div v-else class="flex-1" />

        <!-- Action buttons (right) -->
        <div class="flex shrink-0 items-center gap-2">
          <UButton
            icon="i-lucide-upload"
            label="Upload"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="triggerFileInput"
          />
          <UButton
            v-if="images.length > 0"
            icon="i-lucide-trash-2"
            label="Clear All"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="clearAll"
          />
          <UButton
            icon="i-lucide-download"
            :label="images.length > 1 ? 'Download All' : 'Download'"
            color="primary"
            variant="outline"
            size="sm"
            :loading="isDownloadingAll"
            :disabled="!selectedImage?.ditheredDataUrl"
            @click="handleDownload"
          />
        </div>
      </footer>
    </div>

    </div>
  </div>
</template>
