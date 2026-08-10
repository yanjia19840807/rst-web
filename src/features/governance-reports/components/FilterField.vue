<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <label class="grid gap-1.5 text-xs text-muted-foreground">
    {{ label }}
    <slot />
  </label>
</template>
