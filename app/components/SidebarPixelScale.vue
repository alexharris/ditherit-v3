<script setup lang="ts">
const {
  pixeliness,
  pixelScale
} = useDithering()
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

  <!-- Pixeliness (hidden for now, feature preserved) -->
  <template v-if="false">
    <USeparator />
    <div class="px-4 py-4">
      <HelpTooltip>
        <template #label>
          <span class="text-sm font-medium text-highlighted">Pixeliness</span>
        </template>
        <template #help>
          Makes images more "pixely" by increasing the block size.
          Higher values create a more retro, chunky look.
        </template>
        <div class="mt-2">
          <USlider v-model="pixeliness" :min="1" :max="16" :step="1" />
          <span class="text-xs text-gray-500">{{ pixeliness }}x</span>
        </div>
      </HelpTooltip>
    </div>
  </template>
</template>
