// Self-contained Bayer dithering Web Worker
// Duplicates minimal logic from dithering.ts to avoid import resolution issues in workers

type BayerSize = 2 | 4 | 8 | 16

function generateBayerIndex(size: number): number[][] {
  if (size === 2) return [[0, 2], [3, 1]]
  const half = size / 2
  const sub = generateBayerIndex(half)
  const m: number[][] = Array.from({ length: size }, () => new Array(size))
  for (let i = 0; i < half; i++) {
    for (let j = 0; j < half; j++) {
      const v = sub[i]![j]! * 4
      m[2 * i]![2 * j] = v
      m[2 * i]![2 * j + 1] = v + 2
      m[2 * i + 1]![2 * j] = v + 3
      m[2 * i + 1]![2 * j + 1] = v + 1
    }
  }
  return m
}

function toBayerThresholds(m: number[][]): number[][] {
  const n = m.length * m.length
  return m.map(row => row.map(v => Math.floor((v + 0.5) / n * 256)))
}

const BAYER_MATRICES: Record<BayerSize, number[][]> = {
  2: toBayerThresholds(generateBayerIndex(2)),
  4: toBayerThresholds(generateBayerIndex(4)),
  8: toBayerThresholds(generateBayerIndex(8)),
  16: toBayerThresholds(generateBayerIndex(16))
}

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
  bayerSize: BayerSize
}

self.onmessage = function (e: MessageEvent<BayerMessage>) {
  const { pixels, width, height, palette, bayerSize } = e.data
  const data = new Uint8ClampedArray(pixels)
  const len = data.length

  const size = bayerSize || 4
  const matrix = BAYER_MATRICES[size]

  // Color lookup cache: key is (r<<16|g<<8|b), value is [index, r, g, b]
  const colorCache = new Map<number, number[]>()
  const indexedPalette = palette.map((color: number[], id: number) => [id, ...color])

  for (let i = 0; i <= len - 4; i += 4) {
    const x = (i / 4) % width
    const y = Math.floor(i / 4 / width)
    const row = matrix[x % size]!
    const threshold = row[y % size]!

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
