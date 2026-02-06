<script setup lang="ts">
// Import the web component
import 'img-comparison-slider'

defineProps<{
  originalSrc: string
  ditheredSrc: string
  alt?: string
}>()
</script>

<template>
  <div class="image-compare-wrapper">
    <img-comparison-slider class="image-compare-slider">
      <img
        slot="first"
        :src="originalSrc"
        :alt="alt ? `Original: ${alt}` : 'Original image'"
        class="compare-image"
      />
      <img
        slot="second"
        :src="ditheredSrc"
        :alt="alt ? `Dithered: ${alt}` : 'Dithered image'"
        class="compare-image"
      />
    </img-comparison-slider>
    <span class="compare-label label-original">Original</span>
    <span class="compare-label label-dithered">Dithered</span>
  </div>
</template>

<style scoped>
.image-compare-wrapper {
  position: relative;
  display: block;
  line-height: 0;
}

.image-compare-slider {
  --divider-color: rgb(239, 68, 68);
  --default-handle-color: rgb(239, 68, 68);
  --default-handle-width: 50px;
  --divider-width: 3px;
  border-radius: 0.5rem;
  overflow: hidden;
  max-width: 100%;
}

.image-compare-slider:focus {
  outline: none;
}

.compare-image {
  display: block;
  max-width: 100%;
  max-height: 60vh;
  height: auto;
  object-fit: contain;
}

.compare-label {
  position: absolute;
  bottom: 0.75rem;
  font-size: 0.7rem;
  font-weight: 500;
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  color: rgb(255, 255, 255);
  background: rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.label-original {
  left: 0.75rem;
}

.label-dithered {
  right: 0.75rem;
}
</style>
