<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import SubmittedDetails from '@/features/exercise-management/components/SubmittedDetails.vue'

const route = useRoute()
const submissionId = computed(() => String(route.params.submissionId))
</script>

<template>
  <SubmittedDetails mode="approver" :submission-id="submissionId" />
</template>
