<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DateValue } from '@internationalized/date'
import { getLocalTimeZone, parseDate, today } from '@internationalized/date'
import { CalendarIcon } from '@lucide/vue'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDate } from '@/lib/datetime'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    ariaLabel?: string
    disabled?: boolean
    class?: string
  }>(),
  {
    placeholder: 'Pick a date',
    ariaLabel: 'Choose date',
    disabled: false,
    class: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)

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

/** Drives month/year dropdowns; stays on selected date or today when empty. */
const calendarPlaceholder = ref<DateValue>(today(getLocalTimeZone()))

function syncPlaceholder() {
  calendarPlaceholder.value = date.value ?? today(getLocalTimeZone())
}

watch(() => props.modelValue, syncPlaceholder, { immediate: true })

watch(open, (isOpen) => {
  if (isOpen) syncPlaceholder()
})
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        :disabled="disabled"
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
        {{ date ? formatDate(date.toString()) : placeholder }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar
        v-model="date"
        v-model:placeholder="calendarPlaceholder"
        :default-placeholder="calendarPlaceholder"
        layout="month-and-year"
        initial-focus
        @update:model-value="open = false"
      />
    </PopoverContent>
  </Popover>
</template>
