<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { watch } from 'vue'
import { useForm } from 'vee-validate'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import {
  emptyScenarioIdentity,
  scenarioIdentitySchema,
  type ScenarioIdentityValues,
} from '../schemas/scenario'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    title: string
    subtitle: string
    initialName?: string
    initialDescription?: string
    pending?: boolean
    confirmLabel?: string
    pendingLabel?: string
  }>(),
  {
    initialName: '',
    initialDescription: '',
    pending: false,
    confirmLabel: 'Save',
    pendingLabel: 'Saving…',
  },
)

const emit = defineEmits<{
  submit: [values: { name: string; description: string | null }]
}>()

const { defineField, errors, handleSubmit, resetForm } = useForm({
  validationSchema: toTypedSchema(scenarioIdentitySchema),
  initialValues: emptyScenarioIdentity(),
  validateOnMount: false,
})

const [name] = defineField('name')
const [description] = defineField('description')

watch(open, (isOpen) => {
  if (!isOpen) return
  resetForm({
    values: {
      name: props.initialName,
      description: props.initialDescription,
    },
  })
})

const submit = handleSubmit((values: ScenarioIdentityValues) => {
  emit('submit', {
    name: values.name.trim(),
    description: values.description.trim() || null,
  })
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ subtitle }}</DialogDescription>
      </DialogHeader>
      <form class="min-h-0 flex-1 overflow-y-auto px-5 py-4" @submit.prevent="submit">
        <div class="grid gap-3 rounded-lg border bg-card p-4">
          <div class="grid gap-1.5">
            <Label for="scenario-identity-name">Name</Label>
            <Input
              id="scenario-identity-name"
              v-model="name"
              maxlength="30"
              :disabled="pending"
              :aria-invalid="Boolean(errors.name)"
            />
            <p v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</p>
          </div>
          <div class="grid gap-1.5">
            <Label for="scenario-identity-description">Description</Label>
            <Textarea
              id="scenario-identity-description"
              v-model="description"
              rows="3"
              :disabled="pending"
            />
          </div>
        </div>
      </form>
      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
        <Button variant="outline" :disabled="pending" @click="open = false">Cancel</Button>
        <Button :loading="pending" @click="submit">
          {{ pending ? pendingLabel : confirmLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
