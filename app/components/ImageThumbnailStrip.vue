<script setup lang="ts">
import type { GalleryImage } from '~/composables/useImageGallery'

const props = defineProps<{
  images: GalleryImage[]
  selectedId: string | undefined
}>()

const emit = defineEmits<{
  select: [id: string]
  remove: [id: string]
  add: []
}>()

const scrollContainer = ref<HTMLElement>()
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

function updateScrollState() {
  const el = scrollContainer.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 0
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

function scroll(direction: 'left' | 'right') {
  const el = scrollContainer.value
  if (!el) return
  el.scrollBy({ left: direction === 'left' ? -120 : 120, behavior: 'smooth' })
}

watch(() => props.images.length, () => {
  nextTick(updateScrollState)
})

onMounted(() => {
  nextTick(updateScrollState)
})
</script>

<template>
  <div class="relative flex min-w-0 flex-1 items-center">
    <UButton
      v-show="canScrollLeft"
      icon="i-lucide-chevron-left"
      color="neutral"
      variant="ghost"
      size="xs"
      class="shrink-0"
      @click="scroll('left')"
    />
    <div
      ref="scrollContainer"
      class="flex min-w-0 flex-1 gap-2 overflow-x-auto scrollbar-hide"
      @scroll="updateScrollState"
    >
      <div
        v-for="image in images"
        :key="image.id"
        class="group relative shrink-0 cursor-pointer"
        @click="emit('select', image.id)"
      >
        <img
          :src="image.originalSrc"
          :alt="image.fileName"
          class="h-14 w-auto rounded border-2 object-cover transition-all"
          :class="[
            selectedId === image.id
              ? 'border-ditherit shadow-sm shadow-black/30'
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
      </div>
      <!-- Add more button -->
      <button
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-500 dark:border-gray-600 dark:hover:border-gray-500"
        @click="emit('add')"
      >
        <UIcon name="i-lucide-plus" class="size-5" />
      </button>
    </div>
    <UButton
      v-show="canScrollRight"
      icon="i-lucide-chevron-right"
      color="neutral"
      variant="ghost"
      size="xs"
      class="shrink-0"
      @click="scroll('right')"
    />
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
