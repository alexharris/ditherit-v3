import type { BayerSize } from '~/utils/dithering'
import type { DitherMode } from './useDithering'
import { useDithering } from './useDithering'

export interface BenchmarkResult {
  id: string
  ditherMode: DitherMode
  algorithm: string
  colorCount: number
  pixelScale: number
  pixeliness: number
  serpentine: boolean
  paletteLabel: string
  processingTimeMs: number
  inputFileSizeBytes: number
  outputFileSizeBytes: number
  compressionRatio: number
  sizeReductionPct: number
  mse: number
  thumbnailUrl: string
}

interface BenchmarkPermutation {
  ditherMode: DitherMode
  algorithm: string
  bayerSize: BayerSize
  colorCount: number
  pixelScale: number
  pixeliness: number
  serpentine: boolean
  paletteLabel: string
  paletteColors: number[][]
}

export interface BenchmarkConfig {
  diffusionAlgorithms: string[]
  bayerSizes: BayerSize[]
  colorCounts: number[]
  pixelScales: number[]
  pixelinessValues: number[]
  serpentineOptions: boolean[]
  paletteModes: Array<'bw' | 'grays' | 'auto'>
}

const BW_PALETTE: number[][] = [[255, 255, 255], [0, 0, 0]]
const GRAYS_PALETTE: number[][] = [[255, 255, 255], [170, 170, 170], [85, 85, 85], [0, 0, 0]]

function calculateMSE(original: ImageData, dithered: ImageData): number {
  let sum = 0
  for (let i = 0; i < original.data.length; i += 4) {
    const dr = (original.data[i] ?? 0) - (dithered.data[i] ?? 0)
    const dg = (original.data[i + 1] ?? 0) - (dithered.data[i + 1] ?? 0)
    const db = (original.data[i + 2] ?? 0) - (dithered.data[i + 2] ?? 0)
    sum += dr * dr + dg * dg + db * db
  }
  return sum / ((original.data.length / 4) * 3)
}

export function useBenchmark() {
  const results = ref<BenchmarkResult[]>([])
  const isRunning = ref(false)
  const cancelled = ref(false)
  const progressDone = ref(0)
  const progressTotal = ref(0)
  const progressLabel = ref('')
  const elapsedSec = ref(0)

  // Track blob URLs for cleanup
  const activeThumbnailUrls: string[] = []

  const {
    ditherMode, algorithm, serpentine, pixeliness, pixelScale,
    bayerSize, palette, analyzePalette, dither, invalidateQuantCache
  } = useDithering()

  async function extractAutoPalettes(
    image: HTMLImageElement,
    colorCounts: number[]
  ): Promise<Map<number, number[][]>> {
    const map = new Map<number, number[][]>()
    for (const count of colorCounts) {
      // Set palette length so analyzePalette uses `count` as the color target
      palette.value = Array.from({ length: count }, () => [128, 128, 128])
      const colors = analyzePalette(image)
      map.set(count, colors)
    }
    return map
  }

  function buildPermutations(
    config: BenchmarkConfig,
    autoPalettes: Map<number, number[][]>
  ): BenchmarkPermutation[] {
    const perms: BenchmarkPermutation[] = []

    const fixedPalettes: Array<{ label: string, colors: number[][] }> = []
    if (config.paletteModes.includes('bw')) {
      fixedPalettes.push({ label: 'B&W', colors: BW_PALETTE })
    }
    if (config.paletteModes.includes('grays')) {
      fixedPalettes.push({ label: 'Grays', colors: GRAYS_PALETTE })
    }
    const includeAuto = config.paletteModes.includes('auto')

    // Error diffusion permutations
    for (const algo of config.diffusionAlgorithms) {
      for (const scale of config.pixelScales) {
        for (const pix of config.pixelinessValues) {
          for (const serp of config.serpentineOptions) {
            for (const pal of fixedPalettes) {
              perms.push({
                ditherMode: 'diffusion',
                algorithm: algo,
                bayerSize: 4,
                colorCount: pal.colors.length,
                pixelScale: scale,
                pixeliness: pix,
                serpentine: serp,
                paletteLabel: pal.label,
                paletteColors: pal.colors
              })
            }
            if (includeAuto) {
              for (const count of config.colorCounts) {
                const colors = autoPalettes.get(count)
                if (colors) {
                  perms.push({
                    ditherMode: 'diffusion',
                    algorithm: algo,
                    bayerSize: 4,
                    colorCount: count,
                    pixelScale: scale,
                    pixeliness: pix,
                    serpentine: serp,
                    paletteLabel: `Auto ${count}`,
                    paletteColors: colors
                  })
                }
              }
            }
          }
        }
      }
    }

    // Bayer permutations
    for (const bs of config.bayerSizes) {
      for (const scale of config.pixelScales) {
        for (const pix of config.pixelinessValues) {
          for (const pal of fixedPalettes) {
            perms.push({
              ditherMode: 'bayer',
              algorithm: `Bayer ${bs}×${bs}`,
              bayerSize: bs,
              colorCount: pal.colors.length,
              pixelScale: scale,
              pixeliness: pix,
              serpentine: false,
              paletteLabel: pal.label,
              paletteColors: pal.colors
            })
          }
          if (includeAuto) {
            for (const count of config.colorCounts) {
              const colors = autoPalettes.get(count)
              if (colors) {
                perms.push({
                  ditherMode: 'bayer',
                  algorithm: `Bayer ${bs}×${bs}`,
                  bayerSize: bs,
                  colorCount: count,
                  pixelScale: scale,
                  pixeliness: pix,
                  serpentine: false,
                  paletteLabel: `Auto ${count}`,
                  paletteColors: colors
                })
              }
            }
          }
        }
      }
    }

    return perms
  }

  async function runBenchmark(
    testImage: HTMLImageElement,
    inputBlob: Blob,
    config: BenchmarkConfig
  ) {
    if (isRunning.value) return

    isRunning.value = true
    cancelled.value = false
    results.value = []
    progressDone.value = 0
    progressTotal.value = 0
    progressLabel.value = ''
    elapsedSec.value = 0

    // Revoke thumbnails from previous run
    activeThumbnailUrls.forEach(url => URL.revokeObjectURL(url))
    activeThumbnailUrls.length = 0

    // Save original dithering state to restore after benchmark
    const orig = {
      mode: ditherMode.value,
      algo: algorithm.value,
      serp: serpentine.value,
      pix: pixeliness.value,
      scale: pixelScale.value,
      bayer: bayerSize.value,
      palette: [...palette.value]
    }

    const startTime = performance.now()
    const timer = setInterval(() => {
      elapsedSec.value = Math.round((performance.now() - startTime) / 100) / 10
    }, 500)

    try {
      const autoPalettes = includeAuto(config)
        ? await extractAutoPalettes(testImage, config.colorCounts)
        : new Map<number, number[][]>()

      const perms = buildPermutations(config, autoPalettes)
      progressTotal.value = perms.length

      const origCanvas = document.createElement('canvas')

      for (const perm of perms) {
        if (cancelled.value) break

        progressLabel.value = `${perm.algorithm}, ${perm.colorCount} colors, scale ${perm.pixelScale}`

        // Set shared dithering state for this permutation
        ditherMode.value = perm.ditherMode
        algorithm.value = perm.algorithm
        serpentine.value = perm.serpentine
        pixeliness.value = perm.pixeliness
        pixelScale.value = perm.pixelScale
        bayerSize.value = perm.bayerSize
        palette.value = perm.paletteColors
        invalidateQuantCache()

        const offscreen = document.createElement('canvas')
        const start = performance.now()
        let ditherResult

        try {
          ditherResult = await dither(testImage, offscreen)
        } catch (err) {
          console.warn('Benchmark run failed:', err)
          progressDone.value++
          continue
        }

        const runMs = Math.round((performance.now() - start) * 10) / 10

        // MSE: compare dithered output against original drawn at same size
        origCanvas.width = offscreen.width
        origCanvas.height = offscreen.height
        const origCtx = origCanvas.getContext('2d')!
        origCtx.drawImage(testImage, 0, 0, offscreen.width, offscreen.height)
        const origData = origCtx.getImageData(0, 0, offscreen.width, offscreen.height)
        const dithCtx = offscreen.getContext('2d')!
        const dithData = dithCtx.getImageData(0, 0, offscreen.width, offscreen.height)
        const mse = Math.round(calculateMSE(origData, dithData) * 10) / 10

        const outputBytes = ditherResult.blob.size
        const inputBytes = inputBlob.size
        const ratio = outputBytes / inputBytes

        activeThumbnailUrls.push(ditherResult.url)

        const id = [
          perm.ditherMode, perm.algorithm, perm.colorCount,
          perm.pixelScale, perm.pixeliness, perm.serpentine, perm.paletteLabel
        ].join('|')

        results.value.push({
          id,
          ditherMode: perm.ditherMode,
          algorithm: perm.algorithm,
          colorCount: perm.colorCount,
          pixelScale: perm.pixelScale,
          pixeliness: perm.pixeliness,
          serpentine: perm.serpentine,
          paletteLabel: perm.paletteLabel,
          processingTimeMs: runMs,
          inputFileSizeBytes: inputBytes,
          outputFileSizeBytes: outputBytes,
          compressionRatio: Math.round(ratio * 1000) / 1000,
          sizeReductionPct: Math.round((1 - ratio) * 1000) / 10,
          mse,
          thumbnailUrl: ditherResult.url
        })

        progressDone.value++
        // Yield to keep UI responsive
        await new Promise<void>(resolve => setTimeout(resolve, 0))
      }
    } finally {
      clearInterval(timer)
      // Restore original dithering state
      ditherMode.value = orig.mode
      algorithm.value = orig.algo
      serpentine.value = orig.serp
      pixeliness.value = orig.pix
      pixelScale.value = orig.scale
      bayerSize.value = orig.bayer
      palette.value = orig.palette
      invalidateQuantCache()
      isRunning.value = false
    }
  }

  function includeAuto(config: BenchmarkConfig) {
    return config.paletteModes.includes('auto')
  }

  function cancel() {
    cancelled.value = true
  }

  onUnmounted(() => {
    cancelled.value = true
    activeThumbnailUrls.forEach(url => URL.revokeObjectURL(url))
  })

  return {
    results,
    isRunning,
    cancelled,
    progressDone,
    progressTotal,
    progressLabel,
    elapsedSec,
    runBenchmark,
    cancel
  }
}
