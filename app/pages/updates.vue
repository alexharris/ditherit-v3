<script setup lang="ts">
definePageMeta({ layout: 'content' })
useSeoMeta({ title: 'Updates — Dither it!' })

const releases = [
  {
    version: 'v3.0.0-beta',
    date: 'Feb 2026',
    changes: [
      'Complete rebuild in Nuxt 4 + NuxtUI v4',
      'Web Worker for non-blocking image processing',
      'Multi-image gallery with bulk ZIP export',
      'Custom palette editor with import/export',
      'Pixeliness slider for retro block aesthetics',
      'Image comparison slider',
      'File size visualization donut chart',
    ],
  },
  {
    version: 'v2.x',
    date: '2020–2023',
    changes: [
      'Original dither.it — the classic version',
      'Floyd-Steinberg and Bayer dithering',
      'Basic preset palettes',
      'Single image processing',
    ],
  },
]
</script>

<template>
  <div class="space-y-6">
    <div
      v-for="(release, i) in releases"
      :key="release.version"
      class="space-y-2.5"
    >
      <div class="flex items-center gap-2">
        <span class="text-base font-semibold text-gray-800 dark:text-gray-200">{{ release.version }}</span>
        <UBadge
          v-if="i === 0"
          label="Latest"
          color="primary"
          variant="soft"
          size="xs"
        />
        <span class="ml-auto text-sm text-gray-400">{{ release.date }}</span>
      </div>
      <ul class="space-y-1.5 text-base text-gray-600 dark:text-gray-400">
        <li
          v-for="change in release.changes"
          :key="change"
          class="flex items-start gap-2"
        >
          <span class="mt-2 size-1 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" />
          {{ change }}
        </li>
      </ul>
      <USeparator v-if="i < releases.length - 1" />
    </div>
  </div>
</template>
