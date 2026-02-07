import RgbQuant from 'rgbquant'
import { addPixelation, bayerDither } from '~/utils/dithering'

export interface RgbQuantOptions {
  colors: number
  method: number
  boxSize: [number, number]
  boxPxls: number
  initColors: number
  minHueCols: number
  dithKern: string
  dithDelta: number
  dithSerp: boolean
  palette: number[][]
  reIndex: boolean
  useCache: boolean
  cacheFreq: number
  colorDist: string
}

export type DitherMode = 'diffusion' | 'bayer'

export const DIFFUSION_ALGORITHMS = [
  { label: 'Floyd-Steinberg', value: 'FloydSteinberg' },
  { label: 'Atkinson', value: 'Atkinson' },
  { label: 'Jarvis-Judice-Ninke', value: 'JarvisJudiceNinke' },
  { label: 'Stucki', value: 'Stucki' },
  { label: 'Burkes', value: 'Burkes' },
  { label: 'Sierra3', value: 'Sierra3' },
  { label: 'Sierra2', value: 'Sierra2' },
  { label: 'Sierra24A', value: 'Sierra24A' },
  { label: 'Fan', value: 'Fan' },
  { label: 'ShiauFan', value: 'ShiauFan' },
  { label: 'ShiauFan2', value: 'ShiauFan2' }
] as const

export interface DitherResult {
  width: number
  height: number
  blob: Blob
  url: string
}

// Image element cache — avoids re-decoding data URLs on every dither
const imageCache = new Map<string, HTMLImageElement>()

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src)
  if (cached) return Promise.resolve(cached)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageCache.set(src, img)
      resolve(img)
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

export function evictImageCache(src: string) {
  imageCache.delete(src)
}

export function useDithering() {
  const isProcessing = ref(false)
  const ditherMode = ref<DitherMode>('diffusion')
  const algorithm = ref('FloydSteinberg')
  const serpentine = ref(false)
  const pixeliness = ref(1)
  const palette = ref<number[][]>([])

  // RgbQuant instance cache — reused when only algorithm/serpentine changes
  let cachedQuant: any = null
  let cachedPaletteKey = ''

  // Bayer Web Worker (lazily created)
  let worker: Worker | null = null

  function getWorker(): Worker {
    if (!worker) {
      worker = new Worker(
        new URL('~/utils/dither-worker', import.meta.url),
        { type: 'module' }
      )
    }
    return worker
  }

  function getPaletteKey(pal: number[][]): string {
    return pal.map(c => c.join(',')).join('|')
  }

  const rgbQuantOptions = computed<RgbQuantOptions>(() => ({
    colors: palette.value.length || 8,
    method: 2,
    boxSize: [8, 8],
    boxPxls: 2,
    initColors: 4096,
    minHueCols: 2000,
    dithKern: algorithm.value,
    dithDelta: 0,
    dithSerp: serpentine.value,
    palette: palette.value,
    reIndex: false,
    useCache: true,
    cacheFreq: 10,
    colorDist: 'euclidean'
  }))

  function analyzePalette(image: HTMLImageElement): number[][] {
    const q = new RgbQuant({
      ...rgbQuantOptions.value,
      palette: []
    })
    q.sample(image)
    return q.palette(true)
  }

  function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve) => {
      canvas.toBlob(blob => resolve(blob!), 'image/png')
    })
  }

  async function dither(
    sourceImage: HTMLImageElement,
    targetCanvas: HTMLCanvasElement,
    width?: number
  ): Promise<DitherResult> {
    isProcessing.value = true

    try {
      const ctx = targetCanvas.getContext('2d')!
      const finalWidth = width || sourceImage.naturalWidth
      const finalHeight = (sourceImage.naturalHeight / sourceImage.naturalWidth) * finalWidth

      targetCanvas.width = finalWidth
      targetCanvas.height = finalHeight
      ctx.drawImage(sourceImage, 0, 0, finalWidth, finalHeight)

      if (ditherMode.value === 'bayer') {
        // --- Bayer path: offload to Web Worker with main-thread fallback ---
        const paletteToUse = palette.value.length > 0 ? palette.value : analyzePalette(sourceImage)

        try {
          const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight)
          const result = await new Promise<{ pixels: ArrayBuffer; width: number; height: number }>((resolve, reject) => {
            const w = getWorker()
            const timeoutId = setTimeout(() => reject(new Error('Bayer worker timeout')), 10_000)
            w.onmessage = (e) => {
              clearTimeout(timeoutId)
              resolve(e.data)
            }
            w.onerror = (e) => {
              clearTimeout(timeoutId)
              reject(e)
            }
            w.postMessage({
              pixels: imageData.data.buffer,
              width: finalWidth,
              height: finalHeight,
              palette: paletteToUse,
              blockSize: pixeliness.value
            }, [imageData.data.buffer])
          })

          const processedData = new ImageData(
            new Uint8ClampedArray(result.pixels),
            result.width,
            result.height
          )
          ctx.putImageData(processedData, 0, 0)

          if (pixeliness.value > 1) {
            addPixelation(ctx, targetCanvas, finalWidth, finalHeight, pixeliness.value)
          }
        } catch {
          // Worker failed — fall back to main-thread Bayer dithering
          ctx.drawImage(sourceImage, 0, 0, finalWidth, finalHeight)
          const freshImageData = ctx.getImageData(0, 0, finalWidth, finalHeight)
          bayerDither(ctx, freshImageData, paletteToUse, pixeliness.value)
        }
      } else {
        // --- Error diffusion path: cache RgbQuant instance ---
        const palKey = getPaletteKey(palette.value)

        let q: any
        if (cachedQuant && cachedPaletteKey === palKey) {
          // Reuse cached instance — palette tables + color cache already built.
          // Only re-reduce with (potentially different) kernel/serpentine.
          q = cachedQuant
        } else {
          // Palette changed — need fresh instance
          q = new RgbQuant(rgbQuantOptions.value)
          q.sample(sourceImage)
          cachedQuant = q
          cachedPaletteKey = palKey
        }

        // Pass algorithm + serpentine explicitly so the cached instance
        // uses the current values even if they differ from construction
        const ditherResult = q.reduce(targetCanvas, 1, algorithm.value, serpentine.value)
        const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight)
        imageData.data.set(ditherResult)
        ctx.putImageData(imageData, 0, 0)

        if (pixeliness.value > 1) {
          addPixelation(ctx, targetCanvas, finalWidth, finalHeight, pixeliness.value)
        }
      }

      // Async PNG encoding — doesn't block the main thread
      const blob = await canvasToBlob(targetCanvas)
      const url = URL.createObjectURL(blob)

      return {
        width: finalWidth,
        height: finalHeight,
        blob,
        url
      }
    } finally {
      isProcessing.value = false
    }
  }

  function invalidateQuantCache() {
    cachedQuant = null
    cachedPaletteKey = ''
  }

  return {
    // State
    isProcessing,
    ditherMode,
    algorithm,
    serpentine,
    pixeliness,
    palette,

    // Computed
    rgbQuantOptions,

    // Methods
    analyzePalette,
    dither,
    invalidateQuantCache
  }
}
