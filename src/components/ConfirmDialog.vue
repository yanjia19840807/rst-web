<script setup lang="ts">
import { ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import DetailTable, { type DetailRow } from './DetailTable.vue'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    warning?: string
    rows?: DetailRow[]
    confirmLabel?: string
    cancelLabel?: string
    confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    requireReason?: boolean
    reasonLabel?: string
    reasonPlaceholder?: string
    pending?: boolean
  }>(),
  {
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    confirmVariant: 'destructive',
    requireReason: false,
    reasonLabel: 'Reason',
    reasonPlaceholder: 'Optional note',
    pending: false,
  },
)

const emit = defineEmits<{
  confirm: [reason: string]
}>()

const reason = ref('')

watch(open, (value) => {
  if (!value) reason.value = ''
})

function onConfirm() {
  const trimmed = reason.value.trim()
  if (props.requireReason && !trimmed) return
  emit('confirm', trimmed)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">{{ description }}</DialogDescription>
      </DialogHeader>

      <div class="grid gap-4">
        <p v-if="warning" class="text-sm font-semibold text-destructive">{{ warning }}</p>
        <DetailTable v-if="rows?.length" :rows="rows" />
        <div v-if="requireReason" class="grid gap-1.5">
          <Label for="confirm-reason">{{ reasonLabel }}</Label>
          <Textarea
            id="confirm-reason"
            v-model="reason"
            :placeholder="reasonPlaceholder"
            rows="3"
          />
        </div>
        <slot />
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="pending" @click="open = false">
          {{ cancelLabel }}
        </Button>
        <Button
          :variant="confirmVariant"
          :disabled="pending || (requireReason && !reason.trim())"
          @click="onConfirm"
        >
          {{ confirmLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
