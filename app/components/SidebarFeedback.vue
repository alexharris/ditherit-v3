<script setup lang="ts">
const toast = useToast()
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const formName = ref('')
const formEmail = ref('')
const formMessage = ref('')

async function handleSubmit() {
  if (!formName.value || !formEmail.value || !formMessage.value) return
  isSubmitting.value = true
  try {
    const body = new URLSearchParams({
      'form-name': 'contact',
      'name': formName.value,
      'email': formEmail.value,
      'message': formMessage.value
    }).toString()
    const response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    toast.add({
      title: 'Message sent!',
      description: 'Thanks for your feedback.',
      color: 'success'
    })
    formName.value = ''
    formEmail.value = ''
    formMessage.value = ''
    isModalOpen.value = false
  } catch {
    toast.add({
      title: 'Failed to send',
      description: 'Please try again later.',
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="isModalOpen">
    <div class="m-4 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
      <h2 class="pb-2 font-bold">📋 Improve Dither it!</h2>
      <p class="pb-2">Found a bug? Have an idea for a feature? Let me know!</p>
      <span class="text-sm font-medium text-blue-600 underline text-highlighted cursor-pointer transition-colors">
        Submit Feedback
      </span>
    </div>

    <template #content>
      <div class="px-4 py-4">
        <h2 class="text-lg font-semibold text-highlighted mb-4">Submit Feedback</h2>

        <div class="space-y-4">
          <div class="space-y-2">
            <label for="feedback-name" class="block text-sm font-medium text-highlighted">Name</label>
            <input
              v-model="formName"
              type="text"
              id="feedback-name"
              required
              class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 transition-colors"
            />
          </div>

          <div class="space-y-2">
            <label for="feedback-email" class="block text-sm font-medium text-highlighted">Email</label>
            <input
              v-model="formEmail"
              type="email"
              id="feedback-email"
              required
              class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 transition-colors"
            />
          </div>

          <div class="space-y-2">
            <label for="feedback-message" class="block text-sm font-medium text-highlighted">Message</label>
            <textarea
              v-model="formMessage"
              id="feedback-message"
              rows="5"
              required
              class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 transition-colors resize-none"
            ></textarea>
          </div>

          <UButton
            label="Send Message"
            color="primary"
            :loading="isSubmitting"
            :disabled="isSubmitting || !formName || !formEmail || !formMessage"
            @click="handleSubmit"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
