<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import ExerciseDetail from '@/features/exercise-management/components/ExerciseDetail.vue'

const route = useRoute()
const exerciseId = computed(() => String(route.params.id))
</script>

<template>
  <ExerciseDetail :exercise-id="exerciseId" />
</template>
