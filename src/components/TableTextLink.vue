<script setup lang="ts">
defineProps<{
  destructive?: boolean
  disabled?: boolean
  title?: string
}>()
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    :title="title"
    class="cursor-pointer border-0 bg-transparent p-0 font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
    :class="destructive ? 'text-destructive' : 'text-primary'"
  >
    <slot />
  </button>
</template>
