<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import { computed } from 'vue'
import { toast } from 'vue-sonner'

import { useSessionStore } from '@/auth/session'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'

import { useSaveMailPreferences } from '../api/mutations'
import { useMailPreferencesQuery } from '../api/queries'
import type { MailPreferenceType } from '../types'

const session = useSessionStore()
const query = useMailPreferencesQuery(() => session.canManageMailPreferences)
const save = useSaveMailPreferences()

const types = computed(() => query.data.value?.types ?? [])
const email = computed(() => query.data.value?.email || '')
const emailMissing = computed(() => query.data.value?.emailMissing ?? !email.value)

async function onToggle(row: MailPreferenceType, enabled: boolean) {
  if (save.isPending.value) return
  const next = types.value.map((item) =>
    item.id === row.id ? { ...item, enabled } : item,
  )
  try {
    await save.mutateAsync({
      types: next.map((item) => ({ id: item.id, enabled: item.enabled })),
    })
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not save email preferences.')
  }
}
</script>

<template>
  <Card>
    <CardHeader class="border-b">
      <CardTitle>Email notifications</CardTitle>
      <CardDescription>
        Mail is sent to the address on your Timesheet person row. Types you do not own are not shown.
      </CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4 py-4">
      <div v-if="query.isPending.value" class="flex min-h-24 items-center justify-center">
        <Spinner class="size-5 text-primary" />
      </div>
      <template v-else>
        <Alert v-if="emailMissing" variant="warning">
          <TriangleAlert />
          <AlertTitle>No Timesheet email on this account</AlertTitle>
          <AlertDescription>
            RST will skip mail until Daily Timesheet includes emp_email for you. Preferences can still be saved.
          </AlertDescription>
        </Alert>
        <p v-else class="text-sm text-muted-foreground">
          Delivery address: <span class="text-foreground">{{ email }}</span>
        </p>
        <div v-if="types.length === 0" class="text-sm text-muted-foreground">
          This role has no email notifications.
        </div>
        <ul v-else class="grid gap-3">
          <li
            v-for="row in types"
            :key="row.id"
            class="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5"
          >
            <Label :for="`mail-${row.id}`" class="min-w-0 flex-1 cursor-pointer font-normal">
              {{ row.label }}
            </Label>
            <Switch
              :id="`mail-${row.id}`"
              :model-value="row.enabled"
              :disabled="save.isPending.value"
              :label="row.label"
              @update:model-value="onToggle(row, $event)"
            />
          </li>
        </ul>
      </template>
    </CardContent>
  </Card>
</template>
