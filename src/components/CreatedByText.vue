<script setup lang="ts">
import { computed } from 'vue'

import {
  hasDistinctActor,
  ownerLabel,
  viaLabel,
  type AuditActor,
} from '@/lib/auditActor'

const props = defineProps<{
  actor?: AuditActor | null
}>()

const name = computed(() => ownerLabel(props.actor))
const via = computed(() => (hasDistinctActor(props.actor) ? viaLabel(props.actor) : ''))
</script>

<template>
  <span v-if="!name">—</span>
  <span v-else class="grid gap-0.5">
    <span>{{ name }}</span>
    <span v-if="via" class="text-xs text-muted-foreground">{{ via }}</span>
  </span>
</template>
