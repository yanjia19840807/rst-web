<script setup lang="ts">
import TableTextLink from '@/components/TableTextLink.vue'

defineProps<{
  resumeDisabled?: boolean
  discardDisabled?: boolean
}>()

const emit = defineEmits<{
  resume: []
  discard: []
}>()
</script>

<template>
  <span class="inline-flex gap-3">
    <TableTextLink :disabled="resumeDisabled" @click="emit('resume')">Resume</TableTextLink>
    <TableTextLink destructive :disabled="discardDisabled" @click="emit('discard')">
      Discard
    </TableTextLink>
  </span>
</template>
