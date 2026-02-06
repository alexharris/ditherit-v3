<script setup lang="ts">
const props = defineProps<{
  originalSize: number // in bytes
  ditheredFileSize: number | null // in bytes, from blob.size
  fileName?: string
}>()

const originalKb = computed(() => (props.originalSize / 1024).toFixed(1))
const ditheredKb = computed(() => ((props.ditheredFileSize || 0) / 1024).toFixed(1))

const percentage = computed(() => {
  if (!props.originalSize || !props.ditheredFileSize) return 0
  return ((props.ditheredFileSize / props.originalSize) * 100).toFixed(1)
})

const strokeDashArray = computed(() => {
  if (!props.originalSize || !props.ditheredFileSize) return '0 100'
  const pct = (props.ditheredFileSize / props.originalSize) * 100
  return `${pct} ${100 - pct}`
})

const isSmaller = computed(() => (props.ditheredFileSize || 0) < props.originalSize)

const savedKb = computed(() => {
  const saved = (props.originalSize - (props.ditheredFileSize || 0)) / 1024
  return saved > 0 ? saved.toFixed(1) : '0'
})
</script>

<template>
  <div v-if="ditheredFileSize" class="flex flex-col items-center">
    <!-- File name -->
    <p v-if="fileName" class="mb-2 w-full truncate text-center text-sm text-gray-500 dark:text-gray-400">{{ fileName }}</p>

    <!-- Donut Chart -->
    <div class="w-full">
      <svg viewBox="0 0 42 42" class="w-full">
        <!-- Background ring -->
        <circle
          cx="21"
          cy="21"
          r="15.91549430918954"
          fill="transparent"
          stroke="currentColor"
          stroke-width="3"
          class="text-gray-200 dark:text-gray-700"
        />
        <!-- Percentage segment -->
        <circle
          cx="21"
          cy="21"
          r="15.91549430918954"
          fill="transparent"
          :stroke="isSmaller ? '#22c55e' : '#ef4444'"
          stroke-width="3"
          :stroke-dasharray="strokeDashArray"
          stroke-dashoffset="25"
          class="transition-all duration-300"
        />
        <!-- Center text -->
        <text
          x="21"
          y="21"
          text-anchor="middle"
          dominant-baseline="middle"
          class="fill-current text-gray-700 dark:text-gray-200"
        >
          <tspan x="21" dy="-0.4em" font-size="4" font-weight="bold">{{ percentage }}%</tspan>
          <tspan x="21" dy="1.2em" font-size="2.5" class="fill-current text-gray-500 dark:text-gray-400">of original</tspan>
        </text>
      </svg>
    </div>

    <!-- Size details -->
    <div class="mt-4 w-full space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-gray-500 dark:text-gray-400">Original</span>
        <span class="font-medium text-gray-700 dark:text-gray-200">{{ originalKb }} KB</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500 dark:text-gray-400">Dithered</span>
        <span
          class="font-medium"
          :class="isSmaller ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
        >
          {{ ditheredKb }} KB
        </span>
      </div>
      <div
        v-if="isSmaller"
        class="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700"
      >
        <span class="text-gray-500 dark:text-gray-400">Saved</span>
        <span class="font-medium text-green-600 dark:text-green-400">{{ savedKb }} KB</span>
      </div>
    </div>
  </div>
</template>
