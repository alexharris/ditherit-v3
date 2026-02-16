<script setup lang="ts">
const {
  pixeliness,
  pixelScale
} = useDithering()

const advancedOpen = ref(false)
</script>

<template>
  <div class="px-4 py-4">
    <HelpTooltip>
      <template #label>
        <span class="text-sm font-medium text-highlighted">Pixel Scale</span>
      </template>
      <template #help>
        Make the "pixels" bigger for a chunkier look
      </template>
      <div class="mt-2">
        <USlider v-model="pixelScale" :min="1" :max="25" :step="1" />
        <span class="text-xs text-gray-500">{{ pixelScale }}x</span>
      </div>
    </HelpTooltip>
  </div>

  <USeparator />
  <div class="px-4 pb-4 pt-4">
    <button class="flex cursor-pointer items-center gap-1" @click="advancedOpen = !advancedOpen">
      <UIcon
        name="i-lucide-chevron-right"
        class="size-4 transition-transform duration-200"
        :class="{ 'rotate-90': advancedOpen }"
      />
      <span class="text-sm font-medium text-highlighted">Advanced</span>
    </button>
  </div>

  <div v-if="advancedOpen" class="px-4 pb-4">
    <HelpTooltip>
      <template #label>
        <span class="text-sm font-medium text-highlighted">Pixeliness</span>
      </template>
      <template #help>
        Like pixel scale but more chaotic. Might introduce colors not in the selected palette.
      </template>
      <div class="mt-2">
        <USlider v-model="pixeliness" :min="1" :max="25" :step="1" />
        <span class="text-xs text-gray-500">{{ pixeliness }}x</span>
      </div>
    </HelpTooltip>
  </div>
</template>
