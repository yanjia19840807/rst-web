<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

import TableTextLink from '@/components/TableTextLink.vue'

defineProps<{
  label: string
  to?: RouteLocationRaw
}>()
</script>

<template>
  <TableTextLink :to="to">{{ label }}</TableTextLink>
</template>
