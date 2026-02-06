<script setup lang="ts">
const props = defineProps<{
  originalWidth: number
  originalHeight: number
}>()

const emit = defineEmits<{
  change: [payload: { width: number | undefined, valid: boolean }]
}>()

const MAX_WIDTH = 2048
const useCustomSize = ref(false)
const customWidth = ref(0)
const customWidthInput = ref(0)
let widthDebounceTimeout: ReturnType<typeof setTimeout> | null = null

watch(customWidthInput, (val) => {
  if (widthDebounceTimeout) clearTimeout(widthDebounceTimeout)
  widthDebounceTimeout = setTimeout(() => {
    customWidth.value = val
  }, 400)
})

const calculatedHeight = computed(() => {
  if (!props.originalWidth || !props.originalHeight) return 0
  const width = useCustomSize.value ? customWidth.value : props.originalWidth
  return Math.round((props.originalHeight / props.originalWidth) * width)
})

const isWidthValid = computed(() => {
  if (!useCustomSize.value) return true
  return customWidthInput.value > 0 && customWidthInput.value <= MAX_WIDTH
})

function enableCustomSize() {
  if (useCustomSize.value) return
  useCustomSize.value = true
  customWidth.value = props.originalWidth
  customWidthInput.value = props.originalWidth
}

function resetToOriginalSize() {
  useCustomSize.value = false
  customWidth.value = props.originalWidth
  customWidthInput.value = props.originalWidth
}

// Reset when original dimensions change (new image selected)
watch(() => props.originalWidth, (newWidth) => {
  useCustomSize.value = false
  customWidth.value = newWidth
  customWidthInput.value = newWidth
}, { immediate: true })

// Emit resolved state whenever it changes
watch([() => useCustomSize.value, customWidth, isWidthValid], () => {
  emit('change', {
    width: useCustomSize.value ? customWidth.value : undefined,
    valid: isWidthValid.value
  })
}, { immediate: true })
</script>

<template>
  <UFormField label="Image Size">
    <!-- Validation warning -->
    <div v-if="useCustomSize && !isWidthValid" class="mb-2 rounded bg-red-100 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
      Width must be between 1 and {{ MAX_WIDTH }}px
    </div>

    <div class="flex gap-2">
      <!-- Width -->
      <div class="flex-1">
        <label class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Width (px)</label>
        <UInput
          v-model="customWidthInput"
          type="number"
          :min="1"
          :max="MAX_WIDTH"
          size="sm"
          :color="useCustomSize && !isWidthValid ? 'error' : 'neutral'"
          @focus="enableCustomSize"
        />
      </div>

      <!-- Height (read-only) -->
      <div class="flex-1">
        <label class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Height (px)</label>
        <UInput
          :model-value="calculatedHeight"
          type="number"
          size="sm"
          disabled
        />
      </div>
    </div>

    <!-- Reset button -->
    <UButton
      v-if="useCustomSize"
      icon="i-lucide-rotate-ccw"
      label="Reset to original"
      size="xs"
      color="neutral"
      variant="ghost"
      class="mt-2"
      @click="resetToOriginalSize"
    />
  </UFormField>
</template>
