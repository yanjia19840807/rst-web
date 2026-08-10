<script setup lang="ts">
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'

import AppShell from '@/components/layout/AppShell.vue'
import 'vue-sonner/style.css'
</script>

<template>
  <AppShell>
    <RouterView />
  </AppShell>
  <Toaster rich-colors position="top-center" />
</template>
