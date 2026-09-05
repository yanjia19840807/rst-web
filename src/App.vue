<script setup lang="ts">
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'

import AppShell from '@/components/layout/AppShell.vue'
import OperationNoticesDialog from '@/components/OperationNoticesDialog.vue'
import { useRouteLoading } from '@/composables/useRouteLoading'
import { useTheme } from '@/composables/useTheme'
import 'vue-sonner/style.css'

const { theme } = useTheme()
const { routeLoading } = useRouteLoading()
</script>

<template>
  <AppShell :busy="routeLoading">
    <RouterView />
  </AppShell>
  <OperationNoticesDialog />
  <Toaster rich-colors position="top-center" :theme="theme" />
</template>
