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
        
<form name="contact" netlify>
  <p>
    <label>Name <input type="text" name="name" /></label>
  </p>
  <p>
    <label>Email <input type="email" name="email" /></label>
  </p>
  <p>
    <button type="submit">Send</button>
  </p>
</form>
      </div>
    </template>
  </UModal>
</template>
