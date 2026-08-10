<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getLocalTimeZone, today } from '@internationalized/date'
import { CalendarIcon, ChevronLeft, ChevronRight } from '@lucide/vue'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue: number | null
    placeholder?: string
    ariaLabel?: string
    class?: string
    minYear?: number
    maxYear?: number
  }>(),
  {
    placeholder: 'Pick a year',
    ariaLabel: 'Choose year',
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
        :aria-label="ariaLabel"
        :class="
          cn(
            'w-36 justify-start text-left font-normal',
            selected == null && 'text-muted-foreground',
            props.class,
          )
        "
      >
        <CalendarIcon />
        {{ selected != null ? selected : placeholder }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-64 p-3" align="start">
      <div class="mb-3 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous decade"
          @click="shiftDecade(-1)"
        >
          <ChevronLeft />
        </Button>
        <span class="text-sm font-medium">
          {{ decadeStart }} – {{ decadeStart + 9 }}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Next decade"
          @click="shiftDecade(1)"
        >
          <ChevronRight />
        </Button>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <Button
          v-for="year in years"
          :key="year"
          type="button"
          size="sm"
          :variant="selected === year ? 'default' : 'ghost'"
          :class="year < decadeStart || year > decadeStart + 9 ? 'text-muted-foreground' : undefined"
          @click="selectYear(year)"
        >
          {{ year }}
        </Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
