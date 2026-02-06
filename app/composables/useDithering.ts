import RgbQuant from 'rgbquant'
import { bayerDither, addPixelation } from '~/utils/dithering'

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

export function useDithering() {
  const isProcessing = ref(false)
  const ditherMode = ref<DitherMode>('diffusion')
  const algorithm = ref('FloydSteinberg')
  const serpentine = ref(false)
  const pixeliness = ref(1)
  const palette = ref<number[][]>([])

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

  async function dither(
    sourceImage: HTMLImageElement,
    targetCanvas: HTMLCanvasElement,
    width?: number
  ): Promise<{ width: number; height: number; dataUrl: string }> {
    isProcessing.value = true

    try {
      const ctx = targetCanvas.getContext('2d')!
      const finalWidth = width || sourceImage.naturalWidth
      const finalHeight = (sourceImage.naturalHeight / sourceImage.naturalWidth) * finalWidth

      targetCanvas.width = finalWidth
      targetCanvas.height = finalHeight
      ctx.drawImage(sourceImage, 0, 0, finalWidth, finalHeight)

      if (ditherMode.value === 'bayer') {
        const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight)
        const paletteToUse = palette.value.length > 0 ? palette.value : analyzePalette(sourceImage)
        bayerDither(ctx, imageData, paletteToUse, pixeliness.value)
      } else {
        const q = new RgbQuant(rgbQuantOptions.value)
        q.sample(sourceImage)
        const ditherResult = q.reduce(targetCanvas)
        const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight)
        imageData.data.set(ditherResult)
        ctx.putImageData(imageData, 0, 0)

        if (pixeliness.value > 1) {
          addPixelation(ctx, targetCanvas, finalWidth, finalHeight, pixeliness.value)
        }
      }

      const dataUrl = targetCanvas.toDataURL('image/png')

      return {
        width: finalWidth,
        height: finalHeight,
        dataUrl
      }
    } finally {
      isProcessing.value = false
    }
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
    dither
  }
}
