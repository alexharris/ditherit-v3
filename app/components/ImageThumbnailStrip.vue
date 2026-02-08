<script setup lang="ts">
import type { GalleryImage } from '~/composables/useImageGallery'

defineProps<{
  images: GalleryImage[]
  selectedId: string | undefined
}>()

const emit = defineEmits<{
  select: [id: string]
  remove: [id: string]
  add: []
}>()
</script>

<template>
  <div class="flex min-w-0 flex-1 gap-2 overflow-x-auto">
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
    </div>
    <!-- Add more button -->
    <button
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-500 dark:border-gray-600 dark:hover:border-gray-500"
      @click="emit('add')"
    >
      <UIcon name="i-lucide-plus" class="size-5" />
    </button>
  </div>
</template>
