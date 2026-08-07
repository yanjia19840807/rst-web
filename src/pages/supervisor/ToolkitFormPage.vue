<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import ToolkitForm from '@/features/toolkit-management/components/ToolkitForm.vue'

const route = useRoute()
const toolkitId = computed(() =>
  typeof route.params.id === 'string' ? route.params.id : undefined,
)
</script>

<template>
  <ToolkitForm :toolkit-id="toolkitId" />
</template>
