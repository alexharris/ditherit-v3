<script setup lang="ts">
import quantfrogUrl from '~/assets/examples/quantfrog.png'
import { DIFFUSION_ALGORITHMS } from '~/composables/useDithering'
import { BAYER_SIZES } from '~/utils/dithering'
import type { BayerSize } from '~/utils/dithering'
import type { BenchmarkConfig } from '~/composables/useBenchmark'
import { useBenchmark } from '~/composables/useBenchmark'

definePageMeta({ layout: 'content' })
useSeoMeta({ title: 'Performance Benchmarks — Dither it!' })

const {
  results, isRunning, progressDone, progressTotal,
  progressLabel, elapsedSec, runBenchmark, cancel
} = useBenchmark()

// ── Test image ──────────────────────────────────────────────────────────────

type ImageSource = 'builtin' | 'upload' | 'gradient' | 'noise' | 'geometric'

const imageSource = ref<ImageSource>('builtin')
const testImage = ref<HTMLImageElement | null>(null)
const inputBlob = ref<Blob | null>(null)
const imageLoading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const imageSources = [
  { value: 'builtin', label: 'Frog (built-in)' },
  { value: 'upload', label: 'Upload' },
  { value: 'gradient', label: 'Gradient (synthetic)' },
  { value: 'noise', label: 'Noise (synthetic)' },
  { value: 'geometric', label: 'Geometric (synthetic)' }
] as const

function generateSynthetic(type: 'gradient' | 'noise' | 'geometric'): Promise<{ image: HTMLImageElement, blob: Blob }> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!

    if (type === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, 256, 256)
      grad.addColorStop(0, '#ff0000')
      grad.addColorStop(0.16, '#ffff00')
      grad.addColorStop(0.33, '#00ff00')
      grad.addColorStop(0.5, '#00ffff')
      grad.addColorStop(0.66, '#0000ff')
      grad.addColorStop(0.83, '#ff00ff')
      grad.addColorStop(1, '#ff0000')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 256, 256)
    } else if (type === 'noise') {
      const imageData = ctx.createImageData(256, 256)
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = Math.random() * 255
        imageData.data[i + 1] = Math.random() * 255
        imageData.data[i + 2] = Math.random() * 255
        imageData.data[i + 3] = 255
      }
      ctx.putImageData(imageData, 0, 0)
    } else {
      ctx.fillStyle = '#f8f8f8'
      ctx.fillRect(0, 0, 256, 256)
      const shapes = [
        { color: '#e63946', x: 20, y: 20, w: 90, h: 70 },
        { color: '#457b9d', x: 130, y: 30, w: 110, h: 90 },
        { color: '#2a9d8f', x: 30, y: 120, w: 80, h: 80 },
        { color: '#e9c46a', x: 140, y: 150, w: 95, h: 65 },
        { color: '#f4a261', x: 55, y: 190, w: 130, h: 50 }
      ]
      for (const s of shapes) {
        ctx.fillStyle = s.color
        ctx.fillRect(s.x, s.y, s.w, s.h)
      }
    }

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob!)
      const img = new Image()
      img.onload = () => resolve({ image: img, blob: blob! })
      img.src = url
    }, 'image/png')
  })
}

async function loadBuiltinImage() {
  imageLoading.value = true
  try {
    const res = await fetch(quantfrogUrl)
    const blob = await res.blob()
    inputBlob.value = blob
    const url = URL.createObjectURL(blob)
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = url
    })
    testImage.value = img
  } catch (err) {
    console.error('Failed to load built-in image:', err)
  } finally {
    imageLoading.value = false
  }
}

async function loadSyntheticImage(type: 'gradient' | 'noise' | 'geometric') {
  imageLoading.value = true
  try {
    const { image, blob } = await generateSynthetic(type)
    testImage.value = image
    inputBlob.value = blob
  } finally {
    imageLoading.value = false
  }
}

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  inputBlob.value = file
  imageLoading.value = true
  try {
    const url = URL.createObjectURL(file)
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = url
    })
    testImage.value = img
  } finally {
    imageLoading.value = false
  }
}

watch(imageSource, async (val) => {
  testImage.value = null
  inputBlob.value = null
  if (val === 'builtin') {
    await loadBuiltinImage()
  } else if (val === 'gradient' || val === 'noise' || val === 'geometric') {
    await loadSyntheticImage(val)
  }
  // 'upload' handled by file input click
})

// ── Benchmark config ─────────────────────────────────────────────────────────

const selectedDiffusion = ref<string[]>(['FloydSteinberg'])
const selectedBayerSizes = ref<BayerSize[]>([4])
const selectedColorCounts = ref<number[]>([2, 8])
const selectedPixelScales = ref<number[]>([1])
const selectedPixeliness = ref<number[]>([1])
const selectedSerpentine = ref<boolean[]>([false])
const selectedPaletteModes = ref<Array<'bw' | 'grays' | 'auto'>>(['auto'])

const COLOR_COUNTS = [2, 4, 8, 16, 32]
const PIXEL_SCALES = [1, 2, 4]
const PIXELINESS_VALUES = [1, 2, 4, 8]
const PALETTE_MODES = [
  { value: 'auto', label: 'Auto (uses color count)' },
  { value: 'bw', label: 'Black & White' },
  { value: 'grays', label: 'Grays (4)' }
] as const

function toggleItem<T>(arr: T[], item: T) {
  const idx = arr.indexOf(item)
  if (idx === -1) {
    arr.push(item)
  } else if (arr.length > 1) {
    arr.splice(idx, 1)
  }
}

function isSelected<T>(arr: T[], item: T) {
  return arr.includes(item)
}

// Estimated run count
const estimatedRuns = computed(() => {
  const palCount = (selectedPaletteModes.value.includes('auto') ? selectedColorCounts.value.length : 0)
    + (selectedPaletteModes.value.includes('bw') ? 1 : 0)
    + (selectedPaletteModes.value.includes('grays') ? 1 : 0)

  const serpCount = selectedSerpentine.value.length
  const diffusion = selectedDiffusion.value.length
    * selectedPixelScales.value.length
    * selectedPixeliness.value.length
    * serpCount
    * palCount
  const bayer = selectedBayerSizes.value.length
    * selectedPixelScales.value.length
    * selectedPixeliness.value.length
    * palCount
  return diffusion + bayer
})

function applyPreset(preset: 'quick' | 'standard' | 'full') {
  if (preset === 'quick') {
    selectedDiffusion.value = ['FloydSteinberg']
    selectedBayerSizes.value = [4]
    selectedColorCounts.value = [2, 8, 32]
    selectedPixelScales.value = [1]
    selectedPixeliness.value = [1]
    selectedSerpentine.value = [false]
    selectedPaletteModes.value = ['auto']
  } else if (preset === 'standard') {
    selectedDiffusion.value = ['FloydSteinberg', 'Atkinson', 'Stucki', 'Burkes']
    selectedBayerSizes.value = [4, 8]
    selectedColorCounts.value = [2, 8, 32]
    selectedPixelScales.value = [1]
    selectedPixeliness.value = [1]
    selectedSerpentine.value = [false]
    selectedPaletteModes.value = ['auto', 'bw']
  } else {
    selectedDiffusion.value = DIFFUSION_ALGORITHMS.map(a => a.value)
    selectedBayerSizes.value = [2, 4, 8, 16]
    selectedColorCounts.value = [2, 4, 8, 16, 32]
    selectedPixelScales.value = [1, 2, 4]
    selectedPixeliness.value = [1, 2, 4, 8]
    selectedSerpentine.value = [false, true]
    selectedPaletteModes.value = ['auto', 'bw', 'grays']
  }
}

async function startBenchmark() {
  if (!testImage.value || !inputBlob.value || isRunning.value) return
  const config: BenchmarkConfig = {
    diffusionAlgorithms: selectedDiffusion.value,
    bayerSizes: selectedBayerSizes.value,
    colorCounts: selectedColorCounts.value,
    pixelScales: selectedPixelScales.value,
    pixelinessValues: selectedPixeliness.value,
    serpentineOptions: selectedSerpentine.value,
    paletteModes: selectedPaletteModes.value
  }
  await runBenchmark(testImage.value, inputBlob.value, config)
}

// ── Chart / results ───────────────────────────────────────────────────────────

type ChartMetric = 'processingTimeMs' | 'outputFileSizeBytes' | 'sizeReductionPct' | 'mse'
type GroupBy = 'algorithm' | 'colorCount' | 'pixelScale'

const activeMetric = ref<ChartMetric>('processingTimeMs')
const activeGroupBy = ref<GroupBy>('algorithm')

const chartTabs: Array<{ key: ChartMetric, label: string, description: string }> = [
  { key: 'processingTimeMs', label: 'Time', description: 'How long each dither call took in milliseconds. Lower is faster. Bayer is typically much quicker than error diffusion since it needs no per-pixel error propagation.' },
  { key: 'outputFileSizeBytes', label: 'File Size', description: 'PNG output size in KB. Dithered images compress well because large areas of solid color are easy for deflate to encode. Fewer colors and larger pixel blocks usually produce smaller files.' },
  { key: 'sizeReductionPct', label: 'Size Reduction', description: 'How much smaller the dithered PNG is compared to the original input file. A positive percentage means the output is smaller. Negative means the dithered version is actually larger (can happen with noisy inputs or many colors).' },
  { key: 'mse', label: 'MSE', description: 'Mean Squared Error between the dithered output and the original image, averaged per channel per pixel. Lower means the result is closer to the original. High pixeliness or a small color count will push this up.' }
]

const groupByOptions: Array<{ key: GroupBy, label: string }> = [
  { key: 'algorithm', label: 'Algorithm' },
  { key: 'colorCount', label: 'Color Count' },
  { key: 'pixelScale', label: 'Pixel Scale' }
]

const summaryStats = computed(() => {
  if (results.value.length === 0) return null
  const arr = results.value
  const fastest = arr.reduce((a, b) => a.processingTimeMs < b.processingTimeMs ? a : b)
  const bestCompression = arr.reduce((a, b) => a.sizeReductionPct > b.sizeReductionPct ? a : b)
  const mostFaithful = arr.reduce((a, b) => a.mse < b.mse ? a : b)
  return { fastest, bestCompression, mostFaithful }
})

const progressPct = computed(() => {
  if (progressTotal.value === 0) return 0
  return Math.round((progressDone.value / progressTotal.value) * 100)
})

// Load initial image
onMounted(() => {
  loadBuiltinImage()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Config panel -->
    <UCard>
      <div class="space-y-5">
        <!-- Test image + palette row -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <!-- Test image -->
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Test Image
            </p>
            <div class="space-y-1.5">
              <label
                v-for="opt in imageSources"
                :key="opt.value"
                class="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="radio"
                  name="imageSource"
                  :value="opt.value"
                  :checked="imageSource === opt.value"
                  class="accent-[--ui-primary]"
                  @change="imageSource = opt.value as ImageSource"
                >
                <span class="text-sm text-gray-700 dark:text-gray-300">{{ opt.label }}</span>
              </label>
            </div>

            <div
              v-if="imageSource === 'upload'"
              class="mt-2"
            >
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                class="text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-xs file:font-medium dark:file:bg-gray-800 dark:file:text-gray-300"
                @change="onFileChange"
              >
            </div>

            <div
              v-if="imageLoading"
              class="flex items-center gap-2 text-xs text-gray-400"
            >
              <UIcon
                name="i-lucide-loader-circle"
                class="size-3 animate-spin"
              />
              Loading image…
            </div>
            <div
              v-else-if="testImage"
              class="flex items-center gap-2 text-xs text-green-600 dark:text-green-400"
            >
              <UIcon
                name="i-lucide-check-circle"
                class="size-3"
              />
              {{ testImage.naturalWidth }}×{{ testImage.naturalHeight }}px
              · {{ inputBlob ? (inputBlob.size / 1024).toFixed(1) + ' KB' : '' }}
            </div>
          </div>

          <!-- Palette modes + serpentine -->
          <div class="space-y-4">
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Palette Mode
              </p>
              <div class="space-y-1">
                <label
                  v-for="pm in PALETTE_MODES"
                  :key="pm.value"
                  class="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    :checked="isSelected(selectedPaletteModes, pm.value)"
                    class="accent-[--ui-primary]"
                    @change="toggleItem(selectedPaletteModes, pm.value)"
                  >
                  <span class="text-sm text-gray-700 dark:text-gray-300">{{ pm.label }}</span>
                </label>
              </div>
            </div>
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Serpentine
              </p>
              <div class="flex gap-3">
                <label
                  v-for="opt in [{ label: 'Off', value: false }, { label: 'On', value: true }]"
                  :key="String(opt.value)"
                  class="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    :checked="isSelected(selectedSerpentine, opt.value)"
                    class="accent-[--ui-primary]"
                    @change="toggleItem(selectedSerpentine, opt.value)"
                  >
                  <span class="text-sm text-gray-700 dark:text-gray-300">{{ opt.label }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <USeparator />

        <!-- Algorithms row -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <!-- Diffusion algorithms -->
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Diffusion Algorithms
            </p>
            <div class="grid grid-cols-2 gap-x-3 gap-y-1">
              <label
                v-for="algo in DIFFUSION_ALGORITHMS"
                :key="algo.value"
                class="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="checkbox"
                  :checked="isSelected(selectedDiffusion, algo.value)"
                  class="accent-[--ui-primary]"
                  @change="toggleItem(selectedDiffusion, algo.value)"
                >
                <span class="text-sm text-gray-700 dark:text-gray-300">{{ algo.label }}</span>
              </label>
            </div>
          </div>

          <!-- Bayer + color/scale/pixeliness -->
          <div class="space-y-4">
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Bayer Sizes
              </p>
              <div class="flex flex-wrap gap-x-4 gap-y-1">
                <label
                  v-for="bs in BAYER_SIZES"
                  :key="bs.value"
                  class="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    :checked="isSelected(selectedBayerSizes, bs.value)"
                    class="accent-[--ui-primary]"
                    @change="toggleItem(selectedBayerSizes, bs.value)"
                  >
                  <span class="text-sm text-gray-700 dark:text-gray-300">{{ bs.label }}</span>
                </label>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Color Count <span class="font-normal normal-case text-gray-400">(auto palette only)</span>
              </p>
              <div class="flex flex-wrap gap-x-4 gap-y-1">
                <label
                  v-for="count in COLOR_COUNTS"
                  :key="count"
                  class="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    :checked="isSelected(selectedColorCounts, count)"
                    class="accent-[--ui-primary]"
                    @change="toggleItem(selectedColorCounts, count)"
                  >
                  <span class="text-sm text-gray-700 dark:text-gray-300">{{ count }}</span>
                </label>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Pixel Scale
              </p>
              <div class="flex flex-wrap gap-x-4 gap-y-1">
                <label
                  v-for="scale in PIXEL_SCALES"
                  :key="scale"
                  class="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    :checked="isSelected(selectedPixelScales, scale)"
                    class="accent-[--ui-primary]"
                    @change="toggleItem(selectedPixelScales, scale)"
                  >
                  <span class="text-sm text-gray-700 dark:text-gray-300">{{ scale }}×</span>
                </label>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Pixeliness
              </p>
              <div class="flex flex-wrap gap-x-4 gap-y-1">
                <label
                  v-for="pix in PIXELINESS_VALUES"
                  :key="pix"
                  class="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    :checked="isSelected(selectedPixeliness, pix)"
                    class="accent-[--ui-primary]"
                    @change="toggleItem(selectedPixeliness, pix)"
                  >
                  <span class="text-sm text-gray-700 dark:text-gray-300">{{ pix }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <USeparator />

        <!-- Presets + Run -->
        <div class="space-y-3">
          <div>
            <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Presets
            </p>
            <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Presets configure the checkboxes above. <strong class="text-gray-700 dark:text-gray-300">Quick</strong> runs Floyd-Steinberg + Bayer 4×4 at 3 color counts — good for a fast sanity check.
              <strong class="text-gray-700 dark:text-gray-300">Standard</strong> adds more diffusion algorithms, two Bayer sizes, and a B&W palette pass — a reasonable broad comparison.
              <strong class="text-gray-700 dark:text-gray-300">Full</strong> runs every algorithm, all color counts, all scales, pixeliness values, and palette modes — expect several hundred runs.
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <UButton
                size="xs"
                color="neutral"
                variant="outline"
                label="Quick (~6)"
                @click="applyPreset('quick')"
              />
              <UButton
                size="xs"
                color="neutral"
                variant="outline"
                label="Standard (~60)"
                @click="applyPreset('standard')"
              />
              <UButton
                size="xs"
                color="neutral"
                variant="outline"
                label="Full"
                @click="applyPreset('full')"
              />
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">
              ~{{ estimatedRuns }} run{{ estimatedRuns !== 1 ? 's' : '' }}
            </span>
            <UButton
              v-if="!isRunning"
              color="primary"
              icon="i-lucide-play"
              label="Run Benchmark"
              :disabled="!testImage || estimatedRuns === 0"
              @click="startBenchmark"
            />
            <UButton
              v-else
              color="neutral"
              variant="outline"
              icon="i-lucide-square"
              label="Cancel"
              @click="cancel"
            />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Progress bar -->
    <UCard v-if="isRunning || (progressTotal > 0 && progressDone < progressTotal)">
      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="font-medium text-gray-700 dark:text-gray-300">
            {{ progressDone }} / {{ progressTotal }} runs complete
          </span>
          <span class="text-gray-500 dark:text-gray-400">
            {{ elapsedSec }}s elapsed
          </span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            class="h-full rounded-full bg-[--ui-primary] transition-all duration-300"
            :style="{ width: `${progressPct}%` }"
          />
        </div>
        <p class="truncate text-xs text-gray-500 dark:text-gray-400">
          {{ progressLabel || 'Preparing…' }}
        </p>
      </div>
    </UCard>

    <!-- Summary cards -->
    <div
      v-if="summaryStats"
      class="grid grid-cols-1 gap-4 sm:grid-cols-3"
    >
      <UCard>
        <div class="flex items-start gap-3">
          <UIcon
            name="i-lucide-zap"
            class="mt-0.5 size-5 shrink-0 text-amber-500"
          />
          <div class="min-w-0">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400">
              Fastest
            </p>
            <p class="truncate font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
              {{ summaryStats.fastest.algorithm }}
            </p>
            <p class="text-xs text-gray-500">
              {{ summaryStats.fastest.processingTimeMs }} ms
            </p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-start gap-3">
          <UIcon
            name="i-lucide-package"
            class="mt-0.5 size-5 shrink-0 text-green-500"
          />
          <div class="min-w-0">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400">
              Best Compression
            </p>
            <p class="truncate font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
              {{ summaryStats.bestCompression.algorithm }}
            </p>
            <p class="text-xs text-gray-500">
              {{ summaryStats.bestCompression.sizeReductionPct }}% smaller
            </p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-start gap-3">
          <UIcon
            name="i-lucide-eye"
            class="mt-0.5 size-5 shrink-0 text-blue-500"
          />
          <div class="min-w-0">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400">
              Most Faithful
            </p>
            <p class="truncate font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
              {{ summaryStats.mostFaithful.algorithm }}
            </p>
            <p class="text-xs text-gray-500">
              MSE {{ summaryStats.mostFaithful.mse }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Charts -->
    <UCard v-if="results.length > 0">
      <div class="space-y-4">
        <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">
          Results
        </h2>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- Metric tabs -->
          <div class="flex flex-wrap gap-1">
            <button
              v-for="tab in chartTabs"
              :key="tab.key"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              :class="activeMetric === tab.key
                ? 'bg-ditherit text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'"
              @click="activeMetric = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- Group by -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 dark:text-gray-400">Group by:</span>
            <div class="flex gap-1">
              <button
                v-for="g in groupByOptions"
                :key="g.key"
                class="rounded px-2 py-1 text-xs transition-colors"
                :class="activeGroupBy === g.key
                  ? 'bg-gray-200 font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
                @click="activeGroupBy = g.key"
              >
                {{ g.label }}
              </button>
            </div>
          </div>
        </div>

        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{ chartTabs.find(t => t.key === activeMetric)?.description }}
        </p>

        <BenchmarkBarChart
          :results="results"
          :metric="activeMetric"
          :group-by="activeGroupBy"
        />
      </div>
    </UCard>

    <!-- Results table -->
    <BenchmarkTable
      v-if="results.length > 0"
      :results="results"
    />
  </div>
</template>
