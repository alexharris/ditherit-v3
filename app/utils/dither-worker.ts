// Self-contained Bayer dithering Web Worker
// Duplicates minimal logic from dithering.ts to avoid import resolution issues in workers

const bayerThresholdMap: number[][] = [
  [15, 135, 45, 165],
  [195, 75, 225, 105],
  [60, 180, 30, 150],
  [240, 120, 210, 90]
]

// Palette entries are [index, r, g, b]
function getClosestColor(colors: number[][], r: number, g: number, b: number): number[] {
  let minDist = Infinity
  let closest: number[] = colors[0]!
  for (let i = 0; i < colors.length; i++) {
    const c = colors[i]!
    const dr = r - c[1]!
    const dg = g - c[2]!
    const db = b - c[3]!
    const dist = dr * dr + dg * dg + db * db
    if (dist < minDist) {
      minDist = dist
      closest = c
    }
  }
  return closest
}

interface BayerMessage {
  pixels: ArrayBuffer
  width: number
  height: number
  palette: number[][]
  blockSize: number
}

self.onmessage = function (e: MessageEvent<BayerMessage>) {
  const { pixels, width, height, palette } = e.data
  const data = new Uint8ClampedArray(pixels)
  const len = data.length

  // Color lookup cache: key is (r<<16|g<<8|b), value is [index, r, g, b]
  const colorCache = new Map<number, number[]>()
  const indexedPalette = palette.map((color: number[], id: number) => [id, ...color])

  for (let i = 0; i <= len - 4; i += 4) {
    const x = (i / 4) % width
    const y = Math.floor(i / 4 / width)
    const row = bayerThresholdMap[x % 4]!
    const threshold = row[y % 4]!

    const r = Math.floor((data[i]! + threshold) / 2)
    const g = Math.floor((data[i + 1]! + threshold) / 2)
    const b = Math.floor((data[i + 2]! + threshold) / 2)

    const key = (r << 16) | (g << 8) | b
    let closest = colorCache.get(key)
    if (!closest) {
      closest = getClosestColor(indexedPalette, r, g, b)
      colorCache.set(key, closest)
    }

    data[i] = closest[1]!
    data[i + 1] = closest[2]!
    data[i + 2] = closest[3]!
  }

  const transfer: Transferable[] = [data.buffer]
  self.postMessage({ pixels: data.buffer, width, height }, { transfer })
}
