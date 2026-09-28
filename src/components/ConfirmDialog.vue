<script setup lang="ts">
import { computed, ref, useSlots, watch } from 'vue'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'

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
    elevated?: boolean
  }>(),
  {
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    confirmVariant: 'destructive',
    requireReason: false,
    reasonLabel: 'Reason',
    reasonPlaceholder: 'Optional note',
    pending: false,
    elevated: false,
  },
)

const emit = defineEmits<{
  confirm: [reason: string]
  cancel: []
}>()

const slots = useSlots()
const reason = ref('')
const submitted = ref(false)

const headerDescription = computed(() => props.description || props.warning || props.title)
const extraWarning = computed(() => (props.description && props.warning ? props.warning : ''))
const hasExtra = computed(
  () =>
    Boolean(extraWarning.value) ||
    Boolean(props.rows?.length) ||
    props.requireReason ||
    Boolean(slots.default),
)

watch(open, (value, previous) => {
  // Keep the dialog visible while an async confirm is in flight.
  if (!value && props.pending) {
    open.value = true
    return
  }
  if (value) {
    if (!previous) submitted.value = false
    return
  }
  reason.value = ''
  if (previous && !submitted.value) emit('cancel')
})

function onConfirm() {
  if (props.pending) return
  const trimmed = reason.value.trim()
  if (props.requireReason && !trimmed) return
  submitted.value = true
  emit('confirm', trimmed)
}
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent
      :class="elevated ? 'z-[80]' : undefined"
      :overlay-class="elevated ? 'z-[80]' : undefined"
      :aria-busy="pending || undefined"
      @escape-key-down="
        (event: Event) => {
          if (pending) event.preventDefault()
        }
      "
    >
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription>{{ headerDescription }}</AlertDialogDescription>
      </AlertDialogHeader>

      <div v-if="hasExtra" class="grid gap-3">
        <p v-if="extraWarning" class="text-sm font-medium text-destructive">{{ extraWarning }}</p>
        <DetailTable v-if="rows?.length" :rows="rows" />
        <div v-if="requireReason" class="grid gap-1.5 text-left">
          <Label for="confirm-reason">{{ reasonLabel }}</Label>
          <Textarea
            id="confirm-reason"
            v-model="reason"
            :placeholder="reasonPlaceholder"
            rows="3"
            :disabled="pending"
          />
        </div>
        <slot />
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel :disabled="pending">{{ cancelLabel }}</AlertDialogCancel>
        <!-- Button (not AlertDialogAction): Action is DialogClose and dismisses immediately. -->
        <Button
          type="button"
          :variant="confirmVariant"
          :disabled="pending || (requireReason && !reason.trim())"
          :aria-busy="pending || undefined"
          @click="onConfirm"
        >
          <Spinner v-if="pending" />
          {{ confirmLabel }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
