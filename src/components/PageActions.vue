<script setup lang="ts">
import { PAGE_ACTIONS_TARGET_ID } from './page-actions'
</script>

<template>
  <Teleport :to="`#${PAGE_ACTIONS_TARGET_ID}`" defer>
    <slot />
  </Teleport>
</template>
