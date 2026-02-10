<template>
  <UModal>
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
        
        <form name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" class="space-y-4">
          <!-- Hidden fields for Netlify -->
          <input type="hidden" name="form-name" value="contact" />
          <p class="hidden">
            <label>Don't fill this out if you're human: <input name="bot-field" /></label>
          </p>

          <div class="space-y-2">
            <label for="name" class="block text-sm font-medium text-highlighted">Name</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              required 
              class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 transition-colors"
            />
          </div>

          <div class="space-y-2">
            <label for="email" class="block text-sm font-medium text-highlighted">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              required 
              class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 transition-colors"
            />
          </div>

          <div class="space-y-2">
            <label for="message" class="block text-sm font-medium text-highlighted">Message</label>
            <textarea 
              id="message" 
              name="message" 
              rows="5" 
              required 
              class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 transition-colors resize-none"
            ></textarea>
          </div>

          <button 
            type="submit" 
            class="rounded-md font-medium inline-flex items-center disabled:cursor-not-allowed aria-disabled:cursor-not-allowed disabled:opacity-75 aria-disabled:opacity-75 transition-colors px-2.5 py-1.5 text-sm gap-1.5 text-inverted bg-primary hover:bg-primary/75 active:bg-primary/75 disabled:bg-primary aria-disabled:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Send Message
          </button>
        </form>
      </div>
    </template>
  </UModal>
</template>
