<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DateValue } from '@internationalized/date'
import { parseDate, today } from '@internationalized/date'

import { useContextTimeZone } from '@/composables/useContextTimeZone'
import { CalendarIcon } from '@lucide/vue'

import { Button, type ButtonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  PickerClearButton,
  pickerClearFooterClass,
  pickerPopoverClass,
  pickerTriggerClass,
  pickerTriggerWrapClass,
} from '@/components/ui/picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDate } from '@/lib/datetime'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    ariaLabel?: string
    disabled?: boolean
    invalid?: boolean
    size?: ButtonVariants['size']
    class?: string
    timeZone?: string
  }>(),
  {
    placeholder: 'Pick a date',
    ariaLabel: 'Choose date',
    disabled: false,
    invalid: false,
    size: 'default',
    class: undefined,
    timeZone: undefined,
  },
)

const contextTimeZone = useContextTimeZone()
const resolvedTimeZone = computed(() => props.timeZone || contextTimeZone.value)

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
const calendarPlaceholder = ref<DateValue>(today(resolvedTimeZone.value))

function syncPlaceholder() {
  calendarPlaceholder.value = date.value ?? today(resolvedTimeZone.value)
}

watch(() => props.modelValue, syncPlaceholder, { immediate: true })

watch(open, (isOpen) => {
  if (isOpen) syncPlaceholder()
})

const canClear = computed(() => Boolean(date.value) && !props.disabled)

function clear() {
  emit('update:modelValue', '')
  open.value = false
}

function onClearKey() {
  if (!canClear.value) return
  clear()
}
</script>

<template>
  <Popover v-model:open="open" v-slot="{ close }">
    <div :class="pickerTriggerWrapClass">
      <PopoverTrigger as-child>
        <Button
          type="button"
          variant="outline"
          :size="size"
          :disabled="disabled"
          :aria-label="ariaLabel"
          :aria-invalid="invalid || undefined"
          :class="
            cn(
              pickerTriggerClass,
              canClear && 'pr-8',
              date ? 'text-foreground' : 'text-muted-foreground',
              props.class,
            )
          "
          @keydown.delete.prevent="onClearKey"
          @keydown.backspace.prevent="onClearKey"
        >
          <CalendarIcon />
          {{ date ? formatDate(date.toString()) : placeholder }}
        </Button>
      </PopoverTrigger>
      <PickerClearButton v-if="canClear" label="Clear date" @click="clear" />
    </div>
    <PopoverContent :class="pickerPopoverClass" align="start">
      <Calendar
        v-model="date"
        v-model:placeholder="calendarPlaceholder"
        :default-placeholder="calendarPlaceholder"
        :time-zone="resolvedTimeZone"
        layout="month-and-year"
        initial-focus
        @update:model-value="close"
      />
      <div v-if="canClear" :class="pickerClearFooterClass">
        <Button type="button" variant="ghost" size="sm" class="w-full" @click="clear">
          Clear
        </Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
