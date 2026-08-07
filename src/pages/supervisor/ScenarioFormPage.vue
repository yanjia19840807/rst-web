<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import ScenarioForm from '@/features/exercise-management/components/ScenarioForm.vue'

const route = useRoute()
const exerciseId = computed(() => String(route.params.id))
const scenarioId = computed(() => String(route.params.scenarioId))
</script>

<template>
  <ScenarioForm :exercise-id="exerciseId" :scenario-id="scenarioId" />
</template>
