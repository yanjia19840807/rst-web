<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { CalendarIcon, ChevronLeft, ChevronRight } from '@lucide/vue'
import { createYear } from 'reka-ui/date'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatMonth, formatMonthNumber } from '@/lib/datetime'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    ariaLabel?: string
    invalid?: boolean
    class?: string
  }>(),
  {
    placeholder: 'Pick a month',
    ariaLabel: 'Choose month',
    invalid: false,
    class: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)

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
const viewYear = ref((selected.value ?? today(getLocalTimeZone())).year)

watch(open, (value) => {
  if (value) {
    viewYear.value = (selected.value ?? today(getLocalTimeZone())).year
  }
})

const months = computed(() =>
  createYear({ dateObj: new CalendarDate(viewYear.value, 1, 1) }),
)

function selectMonth(month: number) {
  const next = `${viewYear.value}-${formatMonthNumber(month)}`
  emit('update:modelValue', next)
  open.value = false
}

function isSelected(month: number) {
  return selected.value?.year === viewYear.value && selected.value.month === month
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        :aria-label="ariaLabel"
        :aria-invalid="invalid || undefined"
        :class="
          cn(
            'w-44 justify-start text-left font-normal',
            !selected && 'text-muted-foreground',
            props.class,
          )
        "
      >
        <CalendarIcon />
        {{ selected ? formatMonth(modelValue) : placeholder }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-64 p-3" align="start">
      <div class="mb-3 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous year"
          @click="viewYear--"
        >
          <ChevronLeft />
        </Button>
        <span class="text-sm font-medium">{{ viewYear }}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Next year"
          @click="viewYear++"
        >
          <ChevronRight />
        </Button>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <Button
          v-for="monthDate in months"
          :key="monthDate.toString()"
          type="button"
          size="sm"
          :variant="isSelected(monthDate.month) ? 'default' : 'ghost'"
          @click="selectMonth(monthDate.month)"
        >
          {{ formatMonthNumber(monthDate.month) }}
        </Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
