<script setup>
useHead({
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Dither it!'
const description = 'A web application for processing images using dithering.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
