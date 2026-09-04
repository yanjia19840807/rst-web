<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue'

import { Button } from '@/components/ui/button'
import { useTheme } from '@/composables/useTheme'

const { theme, toggleTheme } = useTheme()
</script>

<template>
  <Button
    type="button"
    variant="ghost"
    size="icon"
    class="text-muted-foreground"
    :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleTheme"
  >
    <Sun v-if="theme === 'dark'" />
    <Moon v-else />
  </Button>
</template>
