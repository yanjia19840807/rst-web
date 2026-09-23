<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

const props = defineProps<{
  destructive?: boolean
  disabled?: boolean
  title?: string
  to?: RouteLocationRaw
}>()

const isLink = computed(() => Boolean(props.to) && !props.disabled)

const linkClass =
  'cursor-pointer border-0 bg-transparent p-0 font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline'
</script>

<template>
  <component
    :is="isLink ? RouterLink : 'button'"
    :to="isLink ? to : undefined"
    :type="isLink ? undefined : 'button'"
    :disabled="isLink ? undefined : disabled"
    :title="title"
    :class="[linkClass, destructive ? 'text-destructive' : 'text-primary']"
  >
    <slot />
  </component>
</template>
