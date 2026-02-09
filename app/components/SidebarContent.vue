<script setup lang="ts">
import { DIFFUSION_ALGORITHMS } from '~/composables/useDithering'
import { BAYER_SIZES } from '~/utils/dithering'

const {
  ditherMode,
  algorithm,
  serpentine,
  pixeliness,
  pixelScale,
  bayerSize
} = useDithering()

const {
  paletteColors,
  customPalettes,
  selectedPreset,
  isCustomPaletteSelected,
  setColorAt,
  addColor,
  removeColor,
  selectPreset,
  saveCurrentPalette,
  deleteCustomPalette,
  importFromJson
} = usePalette()

const ditherModes = [
  { label: 'Error Diffusion', value: 'diffusion' },
  { label: 'Bayer (Ordered)', value: 'bayer' }
]
</script>

<template>
  <div class="flex-1 overflow-y-auto py-4">
    <!-- Dither Mode -->
    <div class="space-y-4 px-4 pb-4">
      <HelpTooltip>
        <template #label>
          <span class="text-sm font-medium text-highlighted">Dither Mode</span>
        </template>
        <template #help>
          These methods are different ways to spread around the quantization
          error introduced by reducing an image's color palette. They look quite
          different, try them out!
        </template>
        <URadioGroup v-model="ditherMode" :items="ditherModes" class="mt-2" />
      </HelpTooltip>

      <!-- Algorithm (for diffusion mode) -->
      <USelect
        v-if="ditherMode === 'diffusion'"
        v-model="algorithm"
        :items="DIFFUSION_ALGORITHMS"
        class="w-full"
      />

      <!-- Matrix Size (for bayer mode) -->
      <USelect
        v-if="ditherMode === 'bayer'"
        v-model="bayerSize"
        :items="BAYER_SIZES"
        class="w-full"
      />

      <!-- Serpentine (for diffusion mode) -->
      <HelpTooltip v-if="ditherMode === 'diffusion'">
        <template #label>
          <UCheckbox
            v-model="serpentine"
            label="Serpentine"
          />
        </template>
        <template #help>
          This determines if the dithering just goes left to right, top to
          bottom, or does a snake wiggle.
        </template>
      </HelpTooltip>
    </div>

    <USeparator />

    <!-- Palette Editor -->
    <div class="px-4 py-4">
      <HelpTooltip>
        <template #label>
          <span class="text-sm font-medium text-highlighted">Palette</span>
        </template>
        <template #help>
          The color palette used for dithering. Choose a preset, edit individual
          colors, or create and save your own custom palettes.
        </template>
        <PaletteEditor
          :palette="paletteColors"
          :custom-palettes="customPalettes"
          :selected-preset="selectedPreset"
          :is-custom-palette-selected="isCustomPaletteSelected"
          class="mt-2"
          @select-preset="selectPreset"
          @set-color="setColorAt"
          @add-color="addColor"
          @remove-color="removeColor"
          @save-custom="saveCurrentPalette"
          @delete-custom="deleteCustomPalette"
          @import="importFromJson"
        />
      </HelpTooltip>
    </div>

    <USeparator />

    <!-- Pixel Scale -->
    <div class="px-4 py-4">
      <HelpTooltip>
        <template #label>
          <span class="text-sm font-medium text-highlighted">Pixel Scale</span>
        </template>
        <template #help>
          Dithers at a reduced resolution then upscales with nearest-neighbor
          interpolation, producing coherent chunky pixels with uniform color blocks.
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
  </div>
</template>
