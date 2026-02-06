<script setup lang="ts">
import { DIFFUSION_ALGORITHMS } from '~/composables/useDithering'
import type { GalleryImage } from '~/composables/useImageGallery'
import defaultImageUrl from '~/assets/examples/quantfrog.png'

const colorMode = useColorMode()
const {
  isProcessing,
  ditherMode,
  algorithm,
  serpentine,
  pixeliness,
  palette,
  analyzePalette,
  dither
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
const processingImageRef = ref<HTMLImageElement>()

const isDragging = ref(false)
const isIntro = ref(true)
const showCompare = ref(false)

// Image sizing state
const originalWidth = ref(0)
const originalHeight = ref(0)
const useCustomSize = ref(false)
const customWidth = ref(0)
const customWidthInput = ref(0)
let widthDebounceTimeout: ReturnType<typeof setTimeout> | null = null

watch(customWidthInput, (val) => {
  if (widthDebounceTimeout) clearTimeout(widthDebounceTimeout)
  widthDebounceTimeout = setTimeout(() => {
    customWidth.value = val
  }, 400)
})

const MAX_WIDTH = 2048

const calculatedHeight = computed(() => {
  if (!originalWidth.value || !originalHeight.value) return 0
  const width = useCustomSize.value ? customWidth.value : originalWidth.value
  return Math.round((originalHeight.value / originalWidth.value) * width)
})

const outputWidth = computed(() => {
  return useCustomSize.value ? customWidth.value : originalWidth.value
})

const isWidthValid = computed(() => {
  if (!useCustomSize.value) return true
  return customWidthInput.value > 0 && customWidthInput.value <= MAX_WIDTH
})

const ditherModes = [
  { label: 'Error Diffusion', value: 'diffusion' },
  { label: 'Bayer (Ordered)', value: 'bayer' }
]

function enableCustomSize() {
  if (useCustomSize.value) return
  useCustomSize.value = true
  customWidth.value = originalWidth.value
  customWidthInput.value = originalWidth.value
}

function resetToOriginalSize() {
  useCustomSize.value = false
  customWidth.value = originalWidth.value
  customWidthInput.value = originalWidth.value
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

function warnRejectedFiles(rejected: string[]) {
  if (rejected.length === 0) return
  const names = rejected.join(', ')
  toast.add({
    title: 'File too large',
    description: `${names} exceeded the 2.5 MB limit and was not added.`,
    color: 'error'
  })
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    if (isIntro.value) {
      isIntro.value = false
      clearAll()
    }
    const rejected = addImages(files)
    warnRejectedFiles(rejected)
  }
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    if (isIntro.value) {
      isIntro.value = false
      clearAll()
    }
    const rejected = addImages(target.files)
    warnRejectedFiles(rejected)
    // Reset input so same file can be selected again
    target.value = ''
  }
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

// Process a single image using a temporary img element
async function processImageForDither(image: GalleryImage, width?: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = async () => {
      try {
        const canvas = canvasRef.value
        if (!canvas) {
          reject(new Error('Canvas not available'))
          return
        }
        const result = await dither(img, canvas, width)
        resolve(result.dataUrl)
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = image.originalSrc
  })
}

function generateResizedOriginal(image: GalleryImage, width: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const height = (img.naturalHeight / img.naturalWidth) * width
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = image.originalSrc
  })
}

async function handleDither() {
  if (!selectedImage.value || !canvasRef.value || !isWidthValid.value) return

  setProcessing(selectedImage.value.id, true)
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

  try {
    const width = useCustomSize.value ? customWidth.value : undefined
    const dataUrl = await processImageForDither(selectedImage.value, width)
    setDitheredResult(selectedImage.value.id, dataUrl)

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

async function handleSelectImage(id: string) {
  selectImage(id)
}

function downloadSingleImage() {
  if (!selectedImage.value?.ditheredDataUrl) return
  const link = document.createElement('a')
  const baseName = selectedImage.value.fileName.replace(/\.[^.]+$/, '')
  link.download = `${baseName}-dithered.png`
  link.href = selectedImage.value.ditheredDataUrl
  link.click()
}

async function handleDownload() {
  if (images.value.length > 1) {
    await downloadAll(processImageForDither)
  } else {
    if (!selectedImage.value?.ditheredDataUrl) return
    const link = document.createElement('a')
    const baseName = selectedImage.value.fileName.replace(/\.[^.]+$/, '')
    link.download = `${baseName}-dithered.png`
    link.href = selectedImage.value.ditheredDataUrl
    link.click()
  }
}

// Load default image on startup (auto-dither triggers via settings watcher)
onMounted(() => {
  if (!hasImages.value) {
    addImageFromUrl(defaultImageUrl, 'quantfrog.png')
  }
})

// Update palette and dimensions when selected image changes
watch(selectedImage, (newImage) => {
  if (newImage) {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // Capture original dimensions
      originalWidth.value = img.naturalWidth
      originalHeight.value = img.naturalHeight
      customWidth.value = img.naturalWidth
      customWidthInput.value = img.naturalWidth
      useCustomSize.value = false

      // Analyze palette
      const colors = analyzePalette(img)
      palette.value = colors
      setPaletteFromRgb(colors)
    }
    img.src = newImage.originalSrc
  }
}, { immediate: true })

// Sync palette editor changes to dithering palette
watch(paletteAsRgb, (newPalette) => {
  if (newPalette.length > 0) {
    palette.value = newPalette
  }
}, { deep: true })

// Auto-dither selected image when any setting changes
watch([ditherMode, algorithm, serpentine, pixeliness, paletteAsRgb, outputWidth], () => {
  if (selectedImage.value && isWidthValid.value) {
    debouncedDither()
  }
}, { deep: true })

// Clear dithered results when settings change (for non-selected images)
watch([ditherMode, algorithm, serpentine, pixeliness, paletteAsRgb], () => {
  // Mark other images as needing re-processing
  // Note: width changes only affect the selected image, so we don't include it here
  images.value.forEach(img => {
    if (img.id !== selectedImage.value?.id) {
      img.ditheredDataUrl = null
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

    <!-- Top Bar (full width) -->
    <header class="flex h-12 shrink-0 items-center border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-950">
      <span class="flex-1 text-center text-xl font-bold text-red-600 dark:text-red-400">
        Dither it!
      </span>
      <UButton
        :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
      />
    </header>

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
          <UFormField v-if="originalWidth > 0" label="Image Size">
            <!-- Validation warning -->
            <div v-if="useCustomSize && !isWidthValid" class="mb-2 rounded bg-red-100 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              Width must be between 1 and {{ MAX_WIDTH }}px
            </div>

            <div class="flex gap-2">
              <!-- Width -->
              <div class="flex-1">
                <label class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Width (px)</label>
                <UInput
                  v-model="customWidthInput"
                  type="number"
                  :min="1"
                  :max="MAX_WIDTH"
                  size="sm"
                  :color="useCustomSize && !isWidthValid ? 'error' : 'neutral'"
                  @focus="enableCustomSize"
                />
              </div>

              <!-- Height (read-only) -->
              <div class="flex-1">
                <label class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Height (px)</label>
                <UInput
                  :model-value="calculatedHeight"
                  type="number"
                  size="sm"
                  disabled
                />
              </div>
            </div>

            <!-- Reset button -->
            <UButton
              v-if="useCustomSize"
              icon="i-lucide-rotate-ccw"
              label="Reset to original"
              size="xs"
              color="neutral"
              variant="ghost"
              class="mt-2"
              @click="resetToOriginalSize"
            />
          </UFormField>

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
            class="relative flex flex-1 flex-col items-center justify-center overflow-auto p-8"
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
                v-if="selectedImage.ditheredDataUrl"
                class="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <UButton
                  icon="i-lucide-columns-2"
                  label="Compare"
                  :color="showCompare ? 'primary' : 'neutral'"
                  :variant="showCompare ? 'soft' : 'ghost'"
                  size="xs"
                  @click="showCompare = !showCompare"
                />
                <UButton
                  icon="i-lucide-download"
                  label="Download"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="downloadSingleImage"
                />
              </div>

            </div>
          </div>
        </main>

        <!-- Right Sidebar -->
        <aside
          v-if="selectedImage?.ditheredDataUrl"
          class="w-48 shrink-0 overflow-y-auto "
        >
          <div class="rounded-xl border border-gray-200 bg-white/90 p-4 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-950/90">
            <FileSizeReport
              :original-size="selectedImage.originalFileSize"
              :dithered-data-url="selectedImage.ditheredDataUrl"
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
        <div v-if="hasImages" class="flex min-w-0 flex-1 gap-2 overflow-x-auto">
          <div
            v-for="image in images"
            :key="image.id"
            class="group relative shrink-0 cursor-pointer"
            @click="handleSelectImage(image.id)"
          >
            <img
              :src="image.originalSrc"
              :alt="image.fileName"
              class="h-14 w-auto rounded border-2 object-cover transition-all"
              :class="[
                selectedImage?.id === image.id
                  ? 'border-red-500 ring-2 ring-red-500/30'
                  : 'border-gray-200 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-500'
              ]"
            />
            <!-- Processing indicator -->
            <div
              v-if="image.isProcessing"
              class="absolute inset-0 flex items-center justify-center rounded bg-black/50"
            >
              <UIcon name="i-lucide-loader-2" class="size-4 animate-spin text-red-500" />
            </div>
            <!-- Processed indicator -->
            <div
              v-else-if="image.ditheredDataUrl"
              class="absolute bottom-0.5 right-0.5 rounded-full bg-green-500 p-0.5"
            >
              <UIcon name="i-lucide-check" class="size-2.5 text-white" />
            </div>
            <!-- Remove button -->
            <button
              class="absolute -right-1 -top-1 hidden rounded-full bg-red-500 p-0.5 text-white shadow group-hover:block"
              @click.stop="removeImage(image.id)"
            >
              <UIcon name="i-lucide-x" class="size-3" />
            </button>
          </div>
          <!-- Add more button -->
          <button
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-500 dark:border-gray-600 dark:hover:border-gray-500"
            @click="triggerFileInput"
          >
            <UIcon name="i-lucide-plus" class="size-5" />
          </button>
        </div>
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
