<script setup lang="ts">
definePageMeta({ layout: 'content' })
useSeoMeta({ title: 'Updates — Dither it!' })

const posts = [
  {
    title: 'Beta release of Dither it! v3',
    date: 'February 2026',
    body: `Complete re-write of Dither it!, experimenting with using Claude. Main goals are a simplified UI, improved features, and better mobile mode.`,
  },
]
</script>

<template>
  <div class="space-y-10">
    <article
      v-for="(post, i) in posts"
      :key="post.title"
      class="space-y-2"
    >
      <div>
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {{ post.title }}
        </h2>
        <p class="text-sm text-gray-400">
          {{ post.date }}
        </p>
      </div>
      <div class="space-y-3 text-base text-gray-600 dark:text-gray-400">
        <p
          v-for="paragraph in post.body.split('\n\n')"
          :key="paragraph"
        >
          {{ paragraph }}
        </p>
      </div>
      <USeparator v-if="i < posts.length - 1" class="pt-4" />
    </article>
  </div>
</template>
