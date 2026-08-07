<script setup lang="ts">
import { computed } from 'vue'
import type { DateValue } from '@internationalized/date'
import { DateFormatter, getLocalTimeZone, parseDate, today } from '@internationalized/date'
import { CalendarIcon } from '@lucide/vue'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    ariaLabel?: string
    class?: string
  }>(),
  {
    placeholder: 'Pick a date',
    ariaLabel: 'Choose date',
    class: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const formatter = new DateFormatter('en-GB', { dateStyle: 'medium' })
const defaultPlaceholder = today(getLocalTimeZone())

const date = computed<DateValue | undefined>({
  get() {
    if (!props.modelValue) return undefined
    try {
      return parseDate(props.modelValue)
    } catch {
      return undefined
    }
  },
  set(value) {
    emit('update:modelValue', value?.toString() ?? '')
  },
})
</script>

<template>
  <Popover v-slot="{ close }">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        :aria-label="ariaLabel"
        :class="
          cn(
            'w-44 justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            props.class,
          )
        "
      >
        <CalendarIcon />
        {{ date ? formatter.format(date.toDate(getLocalTimeZone())) : placeholder }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar
        v-model="date"
        :default-placeholder="defaultPlaceholder"
        layout="month-and-year"
        initial-focus
        @update:model-value="close"
      />
    </PopoverContent>
  </Popover>
</template>
