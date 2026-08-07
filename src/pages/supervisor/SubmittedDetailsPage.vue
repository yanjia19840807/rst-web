<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import SubmittedDetails from '@/features/exercise-management/components/SubmittedDetails.vue'

const route = useRoute()
const exerciseId = computed(() => String(route.params.id))
</script>

<template>
  <SubmittedDetails :exercise-id="exerciseId" />
</template>
