<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getLocalTimeZone, today } from '@internationalized/date'
import { CalendarIcon, ChevronLeft, ChevronRight } from '@lucide/vue'

import { Button, type ButtonVariants } from '@/components/ui/button'
import {
  pickerNavButtonClass,
  pickerPanelClass,
  pickerPopoverClass,
  pickerTriggerClass,
} from '@/components/ui/picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue: number | null
    placeholder?: string
    ariaLabel?: string
    disabled?: boolean
    invalid?: boolean
    size?: ButtonVariants['size']
    class?: string
    minYear?: number
    maxYear?: number
  }>(),
  {
    placeholder: 'Pick a year',
    ariaLabel: 'Choose year',
    disabled: false,
    invalid: false,
    size: 'default',
    class: undefined,
    minYear: 2000,
    maxYear: 2100,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const open = ref(false)
const currentYear = today(getLocalTimeZone()).year

const selected = computed(() =>
  props.modelValue != null && Number.isFinite(props.modelValue) ? props.modelValue : null,
)

const decadeStart = ref(Math.floor((selected.value ?? currentYear) / 10) * 10)

watch(open, (value) => {
  if (value) {
    decadeStart.value = Math.floor((selected.value ?? currentYear) / 10) * 10
  }
})

const years = computed(() =>
  Array.from({ length: 12 }, (_, index) => decadeStart.value - 1 + index).filter(
    (year) => year >= props.minYear && year <= props.maxYear,
  ),
)

function selectYear(year: number) {
  emit('update:modelValue', year)
  open.value = false
}

function shiftDecade(delta: number) {
  decadeStart.value = Math.min(
    Math.max(decadeStart.value + delta * 10, Math.floor(props.minYear / 10) * 10),
    Math.floor(props.maxYear / 10) * 10,
  )
}
</script>

<template>
  <Popover v-model:open="open">
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
            selected == null && 'text-muted-foreground',
            props.class,
          )
        "
      >
        <CalendarIcon />
        {{ selected != null ? selected : placeholder }}
      </Button>
    </PopoverTrigger>
    <PopoverContent :class="cn(pickerPopoverClass, 'min-w-64')" align="start">
      <div :class="pickerPanelClass">
        <div class="flex w-full items-center justify-between gap-1">
          <Button
            type="button"
            variant="outline"
            :class="pickerNavButtonClass"
            aria-label="Previous decade"
            @click="shiftDecade(-1)"
          >
            <ChevronLeft class="cn-rtl-flip size-4" />
          </Button>
          <span class="text-sm font-medium">
            {{ decadeStart }} – {{ decadeStart + 9 }}
          </span>
          <Button
            type="button"
            variant="outline"
            :class="pickerNavButtonClass"
            aria-label="Next decade"
            @click="shiftDecade(1)"
          >
            <ChevronRight class="cn-rtl-flip size-4" />
          </Button>
        </div>
        <div class="mt-4 grid grid-cols-3 gap-2">
          <Button
            v-for="year in years"
            :key="year"
            type="button"
            variant="ghost"
            :class="
              cn(
                'h-8 font-normal',
                selected === year &&
                  'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                (year < decadeStart || year > decadeStart + 9) &&
                  selected !== year &&
                  'text-muted-foreground',
              )
            "
            @click="selectYear(year)"
          >
            {{ year }}
          </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
