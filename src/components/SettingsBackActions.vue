<script setup lang="ts">
import { useRouter } from 'vue-router'

import { useSessionStore } from '@/auth/session'
import PageActions from '@/components/PageActions.vue'
import PageBackButton from '@/components/PageBackButton.vue'

const session = useSessionStore()
const router = useRouter()

function goBack() {
  if (window.history.state?.back != null) {
    router.back()
    return
  }
  void router.push(session.homePath)
}
</script>

<template>
  <PageActions>
    <PageBackButton @click="goBack">Back</PageBackButton>
  </PageActions>
</template>
