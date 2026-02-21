<script setup lang="ts">
definePageMeta({ layout: 'content' })
useSeoMeta({ title: 'Contact — Dither it!' })

const email = ref('')
const message = ref('')
const submitted = ref(false)

function handleSubmit() {
  submitted.value = true
}
</script>

<template>
  <div class="space-y-5">
    <div
      v-if="submitted"
      class="flex flex-col items-center gap-3 py-10 text-center"
    >
      <div class="flex size-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-950">
        <UIcon name="i-lucide-check" class="size-6 text-green-500" />
      </div>
      <div>
        <p class="text-base font-medium text-gray-800 dark:text-gray-200">
          Message sent!
        </p>
        <p class="mt-1 text-sm text-gray-500">
          We'll get back to you within a few days.
        </p>
      </div>
      <UButton
        label="Send another"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="submitted = false; email = ''; message = ''"
      />
    </div>

    <template v-else>
      <p class="text-base text-gray-600 dark:text-gray-400">
        Have a feature request, found a bug, or just want to say hi? We read every message.
      </p>

      <div class="space-y-3">
        <UFormField label="Your email">
          <UInput
            v-model="email"
            placeholder="you@example.com"
            type="email"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Message">
          <UTextarea
            v-model="message"
            placeholder="What's on your mind?"
            :rows="5"
            class="w-full"
          />
        </UFormField>

        <UButton
          label="Send message"
          icon="i-lucide-send"
          block
          :disabled="!email || !message"
          @click="handleSubmit"
        />
      </div>

      <p class="text-center text-sm text-gray-400">
        We read every message and try to reply within a few days.
      </p>
    </template>
  </div>
</template>
