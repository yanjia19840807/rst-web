<script setup lang="ts">
import { useRouter } from 'vue-router'

import { useSessionStore } from '@/auth/session'
import PageActions from '@/components/PageActions.vue'
import { Button } from '@/components/ui/button'

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
    <template #left>
      <Button variant="link" class="h-auto px-0 font-semibold" @click="goBack">
        ← Back
      </Button>
    </template>
  </PageActions>
</template>
