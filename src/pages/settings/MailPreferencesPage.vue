<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'

import { useSessionStore } from '@/auth/session'
import MailPreferencesSettings from '@/features/mail-preference/components/MailPreferencesSettings.vue'

const session = useSessionStore()
const router = useRouter()

watch(
  () =>
    [session.actingAs, session.canManageMailPreferences, session.loading, session.user, session.signedOut] as const,
  ([acting, canManage, loading, user, signedOut]) => {
    if (loading || (!user && !signedOut)) return
    if (acting || !canManage) void router.replace(session.homePath)
  },
  { immediate: true },
)
</script>

<template>
  <MailPreferencesSettings />
</template>
