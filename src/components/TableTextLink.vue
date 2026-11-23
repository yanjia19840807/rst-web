<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

import { Spinner } from '@/components/ui/spinner'

const props = defineProps<{
  destructive?: boolean
  disabled?: boolean
  loading?: boolean
  title?: string
  to?: RouteLocationRaw
}>()

const isLink = computed(() => Boolean(props.to) && !props.disabled && !props.loading)

const linkClass =
  'inline-flex items-center gap-1.5 cursor-pointer border-0 bg-transparent p-0 font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline'
</script>

<template>
  <component
    :is="isLink ? RouterLink : 'button'"
    :to="isLink ? to : undefined"
    :type="isLink ? undefined : 'button'"
    :disabled="isLink ? undefined : disabled || loading"
    :aria-busy="loading || undefined"
    :title="title"
    :class="[linkClass, destructive ? 'text-destructive' : 'text-primary']"
  >
    <Spinner v-if="loading" class="size-3" />
    <slot />
  </component>
</template>
