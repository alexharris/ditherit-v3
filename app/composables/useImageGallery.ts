import JSZip from 'jszip'

export interface GalleryImage {
  id: string
  fileName: string
  originalSrc: string
  originalFileSize: number // in bytes
  ditheredDataUrl: string | null
  resizedOriginalSrc: string | null
  isProcessing: boolean
}

export function useImageGallery() {
  const images = ref<GalleryImage[]>([])
  const selectedId = ref<string | null>(null)
  const isDownloadingAll = ref(false)

  const selectedImage = computed(() =>
    images.value.find(img => img.id === selectedId.value) || null
  )

  const hasImages = computed(() => images.value.length > 0)

  const processedCount = computed(() =>
    images.value.filter(img => img.ditheredDataUrl !== null).length
  )

  function generateId(): string {
    return `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  const MAX_FILE_SIZE = 2.5 * 1024 * 1024 // 2.5 MB

  function addImages(files: FileList | File[]): string[] {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'))
    const rejected: string[] = []

    fileArray.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(file.name)
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const newImage: GalleryImage = {
          id: generateId(),
          fileName: file.name,
          originalSrc: e.target?.result as string,
          originalFileSize: file.size,
          ditheredDataUrl: null,
          resizedOriginalSrc: null,
          isProcessing: false
        }
        images.value.push(newImage)

        // Auto-select if this is the first image
        if (images.value.length === 1) {
          selectedId.value = newImage.id
        }
      }
      reader.readAsDataURL(file)
    })

    return rejected
  }

  async function addImageFromUrl(url: string, fileName: string) {
    const response = await fetch(url)
    const blob = await response.blob()
    const file = new File([blob], fileName, { type: blob.type })
    addImages([file])
  }

  function selectImage(id: string) {
    selectedId.value = id
  }

  function removeImage(id: string) {
    const index = images.value.findIndex(img => img.id === id)
    if (index !== -1) {
      images.value.splice(index, 1)

      // Update selection if we removed the selected image
      if (selectedId.value === id) {
        if (images.value.length > 0) {
          // Select the previous image, or first if we removed the first
          const newIndex = Math.max(0, index - 1)
          selectedId.value = images.value[newIndex].id
        } else {
          selectedId.value = null
        }
      }
    }
  }

  function clearAll() {
    images.value = []
    selectedId.value = null
  }

  function setDitheredResult(id: string, dataUrl: string) {
    const image = images.value.find(img => img.id === id)
    if (image) {
      image.ditheredDataUrl = dataUrl
    }
  }

  function setResizedOriginal(id: string, dataUrl: string | null) {
    const image = images.value.find(img => img.id === id)
    if (image) {
      image.resizedOriginalSrc = dataUrl
    }
  }

  function setProcessing(id: string, processing: boolean) {
    const image = images.value.find(img => img.id === id)
    if (image) {
      image.isProcessing = processing
    }
  }

  function clearDitheredResults() {
    images.value.forEach(img => {
      img.ditheredDataUrl = null
      img.resizedOriginalSrc = null
    })
  }

  async function downloadAll(
    processImage: (image: GalleryImage) => Promise<string>
  ) {
    if (images.value.length === 0) return

    isDownloadingAll.value = true

    try {
      const zip = new JSZip()

      // Process any unprocessed images and add all to ZIP
      for (const image of images.value) {
        let dataUrl = image.ditheredDataUrl

        // Process if not already processed
        if (!dataUrl) {
          image.isProcessing = true
          try {
            dataUrl = await processImage(image)
            image.ditheredDataUrl = dataUrl
          } finally {
            image.isProcessing = false
          }
        }

        if (dataUrl) {
          // Convert data URL to blob
          const base64 = dataUrl.split(',')[1]
          const baseName = image.fileName.replace(/\.[^.]+$/, '')
          zip.file(`${baseName}-dithered.png`, base64, { base64: true })
        }
      }

      // Generate and download ZIP
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'dithered-images.zip'
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      isDownloadingAll.value = false
    }
  }

  return {
    // State
    images,
    selectedId,
    selectedImage,
    hasImages,
    processedCount,
    isDownloadingAll,

    // Methods
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
  }
}
