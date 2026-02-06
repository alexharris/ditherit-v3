<script setup lang="ts">
const colorMode = useColorMode()
</script>

<template>
  <header class="flex h-12 shrink-0 items-center border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-950">
    <span class="flex-1 text-center text-xl font-bold text-red-600 dark:text-red-400">
      Dither it!
    </span>
    <UButton
      :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
      color="neutral"
      variant="ghost"
      size="sm"
      @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
    />
  </header>
</template>
