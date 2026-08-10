<script lang="ts" setup>
import type { CalendarRootEmits, CalendarRootProps, DateValue } from 'reka-ui'
import type { HTMLAttributes, Ref } from 'vue'
import type { LayoutTypes } from '.'
import { getLocalTimeZone, today } from '@internationalized/date'
import { createReusableTemplate, reactiveOmit, useVModel } from '@vueuse/core'
import { CalendarRoot, useForwardPropsEmits } from 'reka-ui'
import { createYear, createYearRange } from 'reka-ui/date'
import { computed, toRaw } from 'vue'
import { formatMonthNumber } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import {
  CalendarCell,
  CalendarCellTrigger,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarHeader,
  CalendarHeading,
  CalendarNextButton,
  CalendarPrevButton,
} from '.'

const selectClass =
  'h-8 appearance-none rounded-md border border-input bg-background px-2 pr-7 text-xs font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

const props = withDefaults(
  defineProps<
    CalendarRootProps & {
      class?: HTMLAttributes['class']
      layout?: LayoutTypes
      yearRange?: DateValue[]
    }
  >(),
  {
    modelValue: undefined,
    layout: undefined,
  },
)
const emits = defineEmits<CalendarRootEmits>()

const delegatedProps = reactiveOmit(props, 'class', 'layout', 'placeholder')

const placeholder = useVModel(props, 'placeholder', emits, {
  passive: true,
  defaultValue: props.defaultPlaceholder ?? today(getLocalTimeZone()),
}) as Ref<DateValue>

const yearRange = computed(() => {
  if (props.yearRange) return props.yearRange
  const anchor =
    toRaw(placeholder.value) ?? props.defaultPlaceholder ?? today(getLocalTimeZone())
  return createYearRange({
    start: props.minValue ?? anchor.cycle('year', -100),
    end: props.maxValue ?? anchor.cycle('year', 10),
  })
})

const [DefineMonthTemplate, ReuseMonthTemplate] = createReusableTemplate<{ date: DateValue }>()
const [DefineYearTemplate, ReuseYearTemplate] = createReusableTemplate<{ date: DateValue }>()

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DefineMonthTemplate v-slot="{ date }">
    <select
      :class="selectClass"
      :value="date.month"
      aria-label="Month"
      @change="
        (e: Event) => {
          placeholder = placeholder.set({
            month: Number((e.target as HTMLSelectElement).value),
          })
        }
      "
    >
      <option
        v-for="month in createYear({ dateObj: date })"
        :key="month.toString()"
        :value="month.month"
      >
        {{ formatMonthNumber(month.month) }}
      </option>
    </select>
  </DefineMonthTemplate>

  <DefineYearTemplate v-slot="{ date }">
    <select
      :class="selectClass"
      :value="date.year"
      aria-label="Year"
      @change="
        (e: Event) => {
          placeholder = placeholder.set({
            year: Number((e.target as HTMLSelectElement).value),
          })
        }
      "
    >
      <option v-for="year in yearRange" :key="year.toString()" :value="year.year">
        {{ year.year }}
      </option>
    </select>
  </DefineYearTemplate>

  <CalendarRoot
    v-slot="{ grid, weekDays, date }"
    v-bind="forwarded"
    v-model:placeholder="placeholder"
    data-slot="calendar"
    :class="
      cn(
        'p-2 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(7)] group/calendar bg-background in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent',
        props.class,
      )
    "
  >
    <CalendarHeader class="pt-0">
      <nav class="flex items-center gap-1 absolute top-0 inset-x-0 justify-between">
        <CalendarPrevButton>
          <slot name="calendar-prev-icon" />
        </CalendarPrevButton>
        <CalendarNextButton>
          <slot name="calendar-next-icon" />
        </CalendarNextButton>
      </nav>

      <slot
        name="calendar-heading"
        :date="date"
        :month="ReuseMonthTemplate"
        :year="ReuseYearTemplate"
      >
        <template v-if="layout === 'month-and-year'">
          <div class="flex items-center justify-center gap-1">
            <ReuseMonthTemplate :date="date" />
            <ReuseYearTemplate :date="date" />
          </div>
        </template>
        <template v-else-if="layout === 'month-only'">
          <div class="flex items-center justify-center gap-1">
            <ReuseMonthTemplate :date="date" />
            {{ date.year }}
          </div>
        </template>
        <template v-else-if="layout === 'year-only'">
          <div class="flex items-center justify-center gap-1">
            {{ formatMonthNumber(date.month) }}
            <ReuseYearTemplate :date="date" />
          </div>
        </template>
        <template v-else>
          <CalendarHeading />
        </template>
      </slot>
    </CalendarHeader>

    <div class="flex flex-col gap-y-4 mt-4 sm:flex-row sm:gap-x-4 sm:gap-y-0">
      <CalendarGrid v-for="month in grid" :key="month.value.toString()">
        <CalendarGridHead>
          <CalendarGridRow>
            <CalendarHeadCell v-for="day in weekDays" :key="day">
              {{ day }}
            </CalendarHeadCell>
          </CalendarGridRow>
        </CalendarGridHead>
        <CalendarGridBody>
          <CalendarGridRow
            v-for="(weekDates, index) in month.rows"
            :key="`weekDate-${index}`"
            class="mt-2 w-full"
          >
            <CalendarCell v-for="weekDate in weekDates" :key="weekDate.toString()" :date="weekDate">
              <CalendarCellTrigger :day="weekDate" :month="month.value" />
            </CalendarCell>
          </CalendarGridRow>
        </CalendarGridBody>
      </CalendarGrid>
    </div>
  </CalendarRoot>
</template>
