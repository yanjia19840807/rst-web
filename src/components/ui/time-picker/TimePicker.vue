<script setup lang="ts">
import { computed, ref } from 'vue'
import { ClockIcon } from '@lucide/vue'

import { Button, type ButtonVariants } from '@/components/ui/button'
import { NativeSelectOption } from '@/components/ui/native-select'
import {
  PickerClearButton,
  PickerOverlaySelect,
  pickerClearFooterClass,
  pickerPanelClass,
  pickerPopoverClass,
  pickerTriggerClass,
  pickerTriggerWrapClass,
} from '@/components/ui/picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { clockParts, composeClock, formatClock, hasClockValue } from './clock'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    disabled?: boolean
    /** Native time step in seconds. Default 60 (minute precision). */
    step?: number | string
    placeholder?: string
    ariaLabel?: string
    invalid?: boolean
    size?: ButtonVariants['size']
    class?: string
  }>(),
  {
    modelValue: '',
    disabled: false,
    step: 60,
    placeholder: 'Pick a time',
    ariaLabel: 'Choose time',
    invalid: false,
    size: 'default',
    class: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const minutePrecision = computed(() => Number(props.step) >= 60)

function pad(value: number) {
  return String(value).padStart(2, '0')
}

const parsed = computed(() => clockParts(props.modelValue))
const hours = computed(() => parsed.value?.hours ?? '')
const minutes = computed(() => parsed.value?.minutes ?? '')
const seconds = computed(() => parsed.value?.seconds ?? '')
const hasValue = computed(() => hasClockValue(props.modelValue))

const display = computed(() => {
  if (!hasValue.value) return props.placeholder
  if (minutePrecision.value) return formatClock(props.modelValue, props.placeholder)
  return `${hours.value}:${minutes.value}:${seconds.value}`
})

const hourOptions = Array.from({ length: 24 }, (_, index) => pad(index))
const minuteOptions = Array.from({ length: 60 }, (_, index) => pad(index))
const secondOptions = Array.from({ length: 60 }, (_, index) => pad(index))

const open = ref(false)
const canClear = computed(() => hasValue.value && !props.disabled)

function clear() {
  emit('update:modelValue', '')
  open.value = false
}

function onClearKey() {
  if (!canClear.value) return
  clear()
}

function emitTime(next: { hours?: string; minutes?: string; seconds?: string }) {
  const picked = next.hours ?? next.minutes ?? next.seconds
  if (picked === '') {
    emit('update:modelValue', '')
    return
  }
  const nextHours = next.hours !== undefined ? next.hours : hours.value === '' ? '00' : hours.value
  const nextMinutes = next.minutes !== undefined ? next.minutes : minutes.value === '' ? '00' : minutes.value
  const nextSeconds = minutePrecision.value
    ? '00'
    : next.seconds !== undefined
      ? next.seconds
      : seconds.value === ''
        ? '00'
        : seconds.value
  emit('update:modelValue', composeClock(nextHours, nextMinutes, nextSeconds))
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
          :data-placeholder="hasValue ? undefined : ''"
          :class="cn(pickerTriggerClass, canClear && 'pr-8', props.class)"
          @keydown.delete.prevent="onClearKey"
          @keydown.backspace.prevent="onClearKey"
        >
          <ClockIcon />
          {{ display }}
        </Button>
      </PopoverTrigger>
      <PickerClearButton v-if="canClear" label="Clear time" @click="clear" />
    </div>
    <PopoverContent :class="pickerPopoverClass" align="start">
      <div :class="cn(pickerPanelClass, 'flex items-center justify-center gap-1')">
        <PickerOverlaySelect
          :model-value="hours"
          :display="hours === '' ? '—' : hours"
          aria-label="Hours"
          @update:model-value="emitTime({ hours: $event })"
        >
          <NativeSelectOption value="">—</NativeSelectOption>
          <NativeSelectOption v-for="option in hourOptions" :key="option" :value="option">
            {{ option }}
          </NativeSelectOption>
        </PickerOverlaySelect>
        <span class="text-muted-foreground px-0.5 text-sm">:</span>
        <PickerOverlaySelect
          :model-value="minutes"
          :display="minutes === '' ? '—' : minutes"
          aria-label="Minutes"
          @update:model-value="emitTime({ minutes: $event })"
        >
          <NativeSelectOption value="">—</NativeSelectOption>
          <NativeSelectOption v-for="option in minuteOptions" :key="option" :value="option">
            {{ option }}
          </NativeSelectOption>
        </PickerOverlaySelect>
        <template v-if="!minutePrecision">
          <span class="text-muted-foreground px-0.5 text-sm">:</span>
          <PickerOverlaySelect
            :model-value="seconds"
            :display="seconds === '' ? '—' : seconds"
            aria-label="Seconds"
            @update:model-value="emitTime({ seconds: $event })"
          >
            <NativeSelectOption value="">—</NativeSelectOption>
            <NativeSelectOption v-for="option in secondOptions" :key="option" :value="option">
              {{ option }}
            </NativeSelectOption>
          </PickerOverlaySelect>
        </template>
      </div>
      <div v-if="canClear" :class="pickerClearFooterClass">
        <Button type="button" variant="ghost" size="sm" class="w-full" @click="clear">
          Clear
        </Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
