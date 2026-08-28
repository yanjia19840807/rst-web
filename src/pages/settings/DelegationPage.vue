<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'

import { useSessionStore } from '@/auth/session'
import DelegationSettings from '@/features/delegation/components/DelegationSettings.vue'

const session = useSessionStore()
const router = useRouter()

watch(
  () => session.actingAs,
  (acting) => {
    if (acting) void router.replace(session.homePath)
  },
  { immediate: true },
)
</script>

<template>
  <DelegationSettings />
</template>
