<script setup lang="ts">
definePageMeta({ layout: 'content' })
useSeoMeta({ title: 'Resources — Dither it!' })

const resourceSections = [
  {
    title: 'Articles & Tutorials',
    links: [
      {
        title: 'Dithering: a visual dithering tutorial',
        description: 'Amazing visual tutorial of how dithering works.',
        url: 'https://visualrambling.space/dithering-part-1/',
      },
      {
        title: 'Ditherpunk — The article I wish I had about monochrome image dithering',
        description: 'A great, comprehensive and technical run-down of many different dithering methods.',
        url: 'https://surma.dev/things/ditherpunk/index.html',
      },
      {
        title: 'Image Dithering: Eleven Algorithms and Source Code',
        description: 'A helpful article with great examples and in-depth info.',
        url: 'https://tannerhelland.com/2012/12/28/dithering-eleven-algorithms-source-code.html',
      },
      {
        title: 'Dithering.',
        description: 'A nice little rundown of some error diffusion algorithms, including one developed by the author.',
        url: 'https://hbfs.wordpress.com/2013/12/31/dithering/',
      },
      {
        title: 'Low-tech Magazine Solar Website',
        description: 'The inspiration for Dither it! — discusses Low-tech Magazine\'s decision to use dithered images on the solar powered version of their site.',
        url: 'https://solar.lowtechmagazine.com/about.html',
      },
    ],
  },
  {
    title: 'Tools',
    links: [
      {
        title: 'Dithering Studio',
        description: 'A cool dithering tool with a nice video mode.',
        url: 'https://ditheringstudio.com/en/',
      },
      {
        title: 'Dither me this',
        description: 'A site very similar to Dither it!',
        url: 'https://doodad.dev/dither-me-this/',
      },
      {
        title: 'Didder',
        description: 'A beefy command line interface for dithering images.',
        url: 'https://github.com/makeworld-the-better-one/didder',
      },
      {
        title: 'Image dithering with ImageMagick',
        description: 'ImageMagick has some robust quantization and dithering functionality.',
        url: 'https://legacy.imagemagick.org/Usage/quantize/',
      },
      {
        title: 'PHP imagetruecolortopalette',
        description: 'A PHP function for very simple image dithering.',
        url: 'https://www.php.net/manual/en/function.imagetruecolortopalette.php',
      },
    ],
  },
  {
    title: 'Libraries',
    links: [
      {
        title: 'RgbQuant.js',
        description: 'The quantization library that powers Dither it!',
        url: 'http://leeoniya.github.io/RgbQuant.js/demo/',
      },
      {
        title: 'Image-q',
        description: 'A fork of RgbQuant.js with some additional features.',
        url: 'https://github.com/ibezkrovnyi/image-quantization',
      },
    ],
  },
]
</script>

<template>
  <div class="space-y-5">
    <p class="text-base text-gray-600 dark:text-gray-400">
      A list of dithering resources from around the internet.
    </p>
    <div
      v-for="section in resourceSections"
      :key="section.title"
      class="space-y-1"
    >
      <p class="px-1 text-sm font-semibold uppercase tracking-wider text-gray-400">
        {{ section.title }}
      </p>
      <div class="space-y-0.5">
        <a
          v-for="link in section.links"
          :key="link.url"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="group flex items-start justify-between gap-2 rounded-lg px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          <div>
            <div class="text-base font-medium text-gray-800 group-hover:text-[--ui-primary] dark:text-gray-200">
              {{ link.title }}
            </div>
            <div class="mt-0.5 text-sm text-gray-500">
              {{ link.description }}
            </div>
          </div>
          <UIcon
            name="i-lucide-arrow-up-right"
            class="mt-0.5 size-3.5 shrink-0 text-gray-400 group-hover:text-[--ui-primary]"
          />
        </a>
      </div>
    </div>
  </div>
</template>
