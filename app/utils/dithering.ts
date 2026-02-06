export function getClosestColor(colors: number[][], [r2, g2, b2]: number[]): number[] {
  let minDist = Infinity
  let closest = colors[0]
  for (let i = 0; i < colors.length; i++) {
    const [, r1, g1, b1] = colors[i]
    const dist = (r2 - r1) ** 2 + (g2 - g1) ** 2 + (b2 - b1) ** 2
    if (dist < minDist) {
      minDist = dist
      closest = colors[i]
    }
  }
  return closest
}

export function addPixelation(
  ctx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  blockSize: number
) {
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')!
  tempCanvas.width = width / blockSize
  tempCanvas.height = height / blockSize

  tempCtx.imageSmoothingEnabled = false
  tempCtx.drawImage(sourceCanvas, 0, 0, tempCanvas.width, tempCanvas.height)

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(
    tempCanvas,
    0,
    0,
    tempCanvas.width,
    tempCanvas.height,
    0,
    0,
    width,
    height
  )
}

export function bayerDither(
  ctx: CanvasRenderingContext2D,
  imageData: ImageData,
  palette: number[][],
  blockSize: number
) {
  const bayerThresholdMap = [
    [15, 135, 45, 165],
    [195, 75, 225, 105],
    [60, 180, 30, 150],
    [240, 120, 210, 90]
  ]

  const imageDataLength = imageData.data.length
  const w = imageData.width

  const newPalette = palette.map((color, id) => [id, ...color])

  for (let currentPixel = 0; currentPixel <= imageDataLength - 4; currentPixel += 4) {
    const x = (currentPixel / 4) % w
    const y = Math.floor(currentPixel / 4 / w)

    const map = Math.floor(
      (imageData.data[currentPixel] + bayerThresholdMap[x % 4][y % 4]) / 2
    )
    const map2 = Math.floor(
      (imageData.data[currentPixel + 1] + bayerThresholdMap[x % 4][y % 4]) / 2
    )
    const map3 = Math.floor(
      (imageData.data[currentPixel + 2] + bayerThresholdMap[x % 4][y % 4]) / 2
    )

    const closestColor = getClosestColor(newPalette, [map, map2, map3])

    imageData.data[currentPixel] = closestColor[1]
    imageData.data[currentPixel + 1] = closestColor[2]
    imageData.data[currentPixel + 2] = closestColor[3]
  }

  ctx.putImageData(imageData, 0, 0)

  if (blockSize > 1) {
    addPixelation(ctx, ctx.canvas, imageData.width, imageData.height, blockSize)
  }
}
