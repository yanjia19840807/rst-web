<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import ApprovalReview from '@/features/approval/components/ApprovalReview.vue'

const route = useRoute()
const submissionId = computed(() => String(route.params.submissionId))
</script>

<template>
  <ApprovalReview :submission-id="submissionId" />
</template>
