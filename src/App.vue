<script setup lang="ts">
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'

import AppShell from '@/components/layout/AppShell.vue'
import OperationNoticesDialog from '@/components/OperationNoticesDialog.vue'
import 'vue-sonner/style.css'
</script>

<template>
  <AppShell>
    <RouterView />
  </AppShell>
  <OperationNoticesDialog />
  <Toaster rich-colors position="top-center" />
</template>
