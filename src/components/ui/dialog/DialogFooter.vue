<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { DialogClose } from 'reka-ui'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes['class']
    showCloseButton?: boolean
  }>(),
  {
    showCloseButton: false,
  },
)
</script>

<template>
  <div
    data-slot="dialog-footer"
    :class="
      cn(
        // Bleed to dialog edges when DialogContent uses p-4; override with mx-0 mb-0 mt-0 on p-0 dialogs.
        'flex flex-col-reverse gap-2 border-t bg-card -mx-4 -mt-4 -mb-4 rounded-b-xl px-4 py-3 sm:flex-row sm:justify-end',
        props.class,
      )
    "
  >
    <slot />
    <DialogClose v-if="showCloseButton" as-child>
      <Button variant="outline"> Close </Button>
    </DialogClose>
  </div>
</template>
