<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
onMounted(() => {
  void router.replace('/approver/timesheet-sync')
})
</script>

<template>
  <p class="text-sm text-muted-foreground">Redirecting to Timesheet Sync…</p>
</template>
