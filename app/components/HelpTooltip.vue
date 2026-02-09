<template>
  <div>
    <div class="flex items-center justify-between">
      <slot name="label" />
      <UPopover arrow :content="{ side: 'right' }">
        <div class="p-1.5 lg:p-0 -m-1.5 lg:m-0">
          <UIcon name="i-lucide-circle-help" class="size-4 cursor-pointer text-ditherit" />
        </div>
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
