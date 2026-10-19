<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { Toaster } from 'vue-sonner'

import AppShell from '@/components/layout/AppShell.vue'
import OperationNoticesDialog from '@/components/OperationNoticesDialog.vue'
import { useRouteLoading } from '@/composables/useRouteLoading'
import { useTheme } from '@/composables/useTheme'
import 'vue-sonner/style.css'

const route = useRoute()
const bareLayout = computed(() => route.meta.layout === 'bare')
const { theme } = useTheme()
const { routeLoading } = useRouteLoading()
</script>

<template>
  <RouterView v-if="bareLayout" />
  <AppShell v-else :busy="routeLoading">
    <RouterView />
  </AppShell>
  <OperationNoticesDialog />
  <Toaster rich-colors position="top-center" :theme="theme" />
</template>
