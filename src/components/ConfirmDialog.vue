<script setup lang="ts">
import { computed, ref, useSlots, watch } from 'vue'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
}>()

const slots = useSlots()
const reason = ref('')

const headerDescription = computed(() => props.description || props.warning || props.title)
const extraWarning = computed(() => (props.description && props.warning ? props.warning : ''))
const hasExtra = computed(
  () =>
    Boolean(extraWarning.value) ||
    Boolean(props.rows?.length) ||
    props.requireReason ||
    Boolean(slots.default),
)

watch(open, (value) => {
  if (!value) reason.value = ''
})

function onConfirm() {
  const trimmed = reason.value.trim()
  if (props.requireReason && !trimmed) return
  emit('confirm', trimmed)
}

function onConfirmAction(event: Event) {
  event.preventDefault()
  onConfirm()
}
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent
      :class="elevated ? 'z-[80]' : undefined"
      :overlay-class="elevated ? 'z-[80]' : undefined"
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
          />
        </div>
        <slot />
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel :disabled="pending">{{ cancelLabel }}</AlertDialogCancel>
        <AlertDialogAction
          :variant="confirmVariant"
          :disabled="pending || (requireReason && !reason.trim())"
          :aria-busy="pending || undefined"
          @click="onConfirmAction"
        >
          <Spinner v-if="pending" />
          {{ confirmLabel }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
