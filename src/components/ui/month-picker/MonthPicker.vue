<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarDate, today } from '@internationalized/date'

import { useContextTimeZone } from '@/composables/useContextTimeZone'
import { CalendarIcon, ChevronLeft, ChevronRight } from '@lucide/vue'
import { useDateFormatter } from 'reka-ui'
import { createYear, createYearRange, toDate } from 'reka-ui/date'

import { Button, type ButtonVariants } from '@/components/ui/button'
import { NativeSelectOption } from '@/components/ui/native-select'
import {
  PickerClearButton,
  PickerOverlaySelect,
  pickerClearFooterClass,
  pickerNavButtonClass,
  pickerPanelClass,
  pickerPopoverClass,
  pickerTriggerClass,
  pickerTriggerWrapClass,
} from '@/components/ui/picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatMonth, formatMonthNumber } from '@/lib/datetime'
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
    placeholder: 'Pick a month',
    ariaLabel: 'Choose month',
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
const formatter = useDateFormatter('en')

function parseMonthValue(value: string): CalendarDate | undefined {
  if (!value) return undefined
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return undefined
  return new CalendarDate(year, month, 1)
}

const selected = computed(() => parseMonthValue(props.modelValue))
const viewYear = ref((selected.value ?? today(resolvedTimeZone.value)).year)

watch(open, (value) => {
  if (value) {
    viewYear.value = (selected.value ?? today(resolvedTimeZone.value)).year
  }
})

const months = computed(() =>
  createYear({ dateObj: new CalendarDate(viewYear.value, 1, 1) }),
)

const yearRange = computed(() => {
  const anchor = selected.value ?? today(resolvedTimeZone.value)
  return createYearRange({
    start: anchor.cycle('year', -100),
    end: anchor.cycle('year', 10),
  })
})

function shiftYear(delta: number) {
  const next = viewYear.value + delta
  const min = yearRange.value[0]?.year
  const max = yearRange.value.at(-1)?.year
  if (min != null && next < min) return
  if (max != null && next > max) return
  viewYear.value = next
}

function selectMonth(month: number) {
  emit('update:modelValue', `${viewYear.value}-${formatMonthNumber(month)}`)
  open.value = false
}

function isSelected(month: number) {
  return selected.value?.year === viewYear.value && selected.value.month === month
}

const canClear = computed(() => Boolean(selected.value) && !props.disabled)

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
  <Popover v-model:open="open">
    <div :class="pickerTriggerWrapClass">
      <PopoverTrigger as-child>
        <Button
          type="button"
          variant="outline"
          :size="size"
          :disabled="disabled"
          :aria-label="ariaLabel"
          :aria-invalid="invalid || undefined"
          :data-placeholder="selected ? undefined : ''"
          :class="cn(pickerTriggerClass, canClear && 'pr-8', props.class)"
          @keydown.delete.prevent="onClearKey"
          @keydown.backspace.prevent="onClearKey"
        >
          <CalendarIcon />
          {{ selected ? formatMonth(modelValue) : placeholder }}
        </Button>
      </PopoverTrigger>
      <PickerClearButton v-if="canClear" label="Clear month" @click="clear" />
    </div>
    <PopoverContent :class="cn(pickerPopoverClass, 'min-w-64')" align="start">
      <div :class="pickerPanelClass">
        <div class="flex w-full items-center justify-between gap-1">
          <Button
            type="button"
            variant="outline"
            :class="pickerNavButtonClass"
            aria-label="Previous year"
            @click="shiftYear(-1)"
          >
            <ChevronLeft class="cn-rtl-flip size-4" />
          </Button>
          <PickerOverlaySelect
            :model-value="String(viewYear)"
            :display="String(viewYear)"
            aria-label="Year"
            @update:model-value="viewYear = Number($event)"
          >
            <NativeSelectOption
              v-for="year in yearRange"
              :key="year.toString()"
              :value="String(year.year)"
              :selected="viewYear === year.year"
            >
              {{ formatter.custom(toDate(year), { year: 'numeric' }) }}
            </NativeSelectOption>
          </PickerOverlaySelect>
          <Button
            type="button"
            variant="outline"
            :class="pickerNavButtonClass"
            aria-label="Next year"
            @click="shiftYear(1)"
          >
            <ChevronRight class="cn-rtl-flip size-4" />
          </Button>
        </div>
        <div class="mt-4 grid grid-cols-3 gap-2">
          <Button
            v-for="monthDate in months"
            :key="monthDate.toString()"
            type="button"
            variant="ghost"
            :class="
              cn(
                'h-8 font-normal',
                isSelected(monthDate.month) &&
                  'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
              )
            "
            @click="selectMonth(monthDate.month)"
          >
            {{ formatMonthNumber(monthDate.month) }}
          </Button>
        </div>
      </div>
      <div v-if="canClear" :class="pickerClearFooterClass">
        <Button type="button" variant="ghost" size="sm" class="w-full" @click="clear">
          Clear
        </Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
