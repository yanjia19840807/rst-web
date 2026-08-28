<script setup lang="ts">
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import ListLoading from '@/components/ListLoading.vue'
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

import { useSaveTimesheetSyncAlert } from '../api/mutations'
import { useTimesheetSyncAlertQuery } from '../api/queries'

const open = defineModel<boolean>('open', { default: false })

const enabled = ref(false)
const recipientsText = ref('')

const alertQuery = useTimesheetSyncAlertQuery(() => open.value)
const saveMutation = useSaveTimesheetSyncAlert()

watch(
  () => alertQuery.data.value,
  (data) => {
    if (!data) return
    enabled.value = data.enabled
    recipientsText.value = data.recipients.join('\n')
  },
  { immediate: true },
)

watch(open, (isOpen) => {
  if (!isOpen) return
  const data = alertQuery.data.value
  if (!data) return
  enabled.value = data.enabled
  recipientsText.value = data.recipients.join('\n')
})

async function onSave() {
  const recipients = recipientsText.value
    .split(/[\n\r,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
  try {
    await saveMutation.mutateAsync({ enabled: enabled.value, recipients })
    toast.success('Email alerts saved.')
    open.value = false
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not save email alerts.')
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
        <DialogTitle>Email alerts</DialogTitle>
        <DialogDescription>
          Notify these addresses when a Daily or Monthly Timesheet sync fails.
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <ListLoading v-if="alertQuery.isPending.value && !alertQuery.data.value" />
        <p v-else-if="alertQuery.isError.value" class="text-sm text-destructive">
          {{
            alertQuery.error.value instanceof Error
              ? alertQuery.error.value.message
              : 'Could not load email alerts.'
          }}
        </p>
        <div v-else class="grid gap-4">
          <Label class="flex items-center gap-2 text-sm font-normal">
            <input v-model="enabled" type="checkbox" />
            Enable failure emails
          </Label>
          <label class="grid gap-1.5 text-sm">
            Recipients
            <Textarea
              v-model="recipientsText"
              :disabled="saveMutation.isPending.value"
              class="min-h-32"
              placeholder="one.email@cma-cgm.com"
            />
            <span class="text-xs text-muted-foreground">
              One email per line. At most 20 addresses.
            </span>
          </label>
        </div>
      </div>

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
        <Button type="button" variant="outline" :disabled="saveMutation.isPending.value" @click="open = false">
          Cancel
        </Button>
        <Button
          type="button"
          :disabled="saveMutation.isPending.value || alertQuery.isPending.value"
          @click="onSave"
        >
          {{ saveMutation.isPending.value ? 'Saving…' : 'Save' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
