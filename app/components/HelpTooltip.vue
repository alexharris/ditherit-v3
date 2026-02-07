<template>
  <div>
    <div class="flex items-center justify-between">
      <slot name="label" />
      <UPopover arrow :content="{ align: 'end' }">
        <UIcon name="i-lucide-circle-help" class="size-4 cursor-pointer text-red-700 dark:text-red-400" />
        <template #content>
          <div class="max-w-64 p-3 text-sm">
            <slot name="help" />
          </div>
        </template>
      </UPopover>
    </div>
    <slot />
  </div>
</template>
