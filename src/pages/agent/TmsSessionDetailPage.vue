<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import TmsSessionDetail from '@/features/tms-management/components/TmsSessionDetail.vue'

const route = useRoute()
const sessionId = computed(() => String(route.params.id ?? ''))
</script>

<template>
  <TmsSessionDetail :session-id="sessionId" />
</template>
