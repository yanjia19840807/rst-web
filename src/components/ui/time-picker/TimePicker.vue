<script setup lang="ts">
import { computed } from 'vue'
import { ClockIcon } from '@lucide/vue'

import { Button, type ButtonVariants } from '@/components/ui/button'
import { NativeSelectOption } from '@/components/ui/native-select'
import {
  PickerOverlaySelect,
  pickerPanelClass,
  pickerPopoverClass,
  pickerTriggerClass,
} from '@/components/ui/picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

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

function pad(value: number | string) {
  return String(value).padStart(2, '0')
}

function parts(value: string) {
  const [hours = '', minutes = '', seconds = ''] = (value || '').split(':')
  return { hours, minutes, seconds }
}

const hours = computed(() => parts(props.modelValue ?? '').hours)
const minutes = computed(() => parts(props.modelValue ?? '').minutes)
const seconds = computed(() => parts(props.modelValue ?? '').seconds)

const hasValue = computed(() => Boolean(hours.value && minutes.value))

const display = computed(() => {
  if (!hasValue.value) return props.placeholder
  if (minutePrecision.value) return `${pad(hours.value)}:${pad(minutes.value)}`
  return `${pad(hours.value)}:${pad(minutes.value)}:${pad(seconds.value || '00')}`
})

const hourOptions = Array.from({ length: 24 }, (_, index) => pad(index))
const minuteOptions = Array.from({ length: 60 }, (_, index) => pad(index))
const secondOptions = Array.from({ length: 60 }, (_, index) => pad(index))

function emitTime(next: { hours?: string; minutes?: string; seconds?: string }) {
  const nextHours = (next.hours ?? hours.value) || '00'
  const nextMinutes = (next.minutes ?? minutes.value) || '00'
  const nextSeconds = minutePrecision.value ? '00' : ((next.seconds ?? seconds.value) || '00')
  emit('update:modelValue', `${pad(nextHours)}:${pad(nextMinutes)}:${pad(nextSeconds)}`)
}
</script>

<template>
  <Popover>
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
            !hasValue && 'text-muted-foreground',
            props.class,
          )
        "
      >
        <ClockIcon />
        {{ display }}
      </Button>
    </PopoverTrigger>
    <PopoverContent :class="pickerPopoverClass" align="start">
      <div :class="cn(pickerPanelClass, 'flex items-center justify-center gap-1')">
        <PickerOverlaySelect
          :model-value="hours || '00'"
          :display="hours ? pad(hours) : '00'"
          aria-label="Hours"
          @update:model-value="emitTime({ hours: $event })"
        >
          <NativeSelectOption v-for="option in hourOptions" :key="option" :value="option">
            {{ option }}
          </NativeSelectOption>
        </PickerOverlaySelect>
        <span class="text-muted-foreground px-0.5 text-sm">:</span>
        <PickerOverlaySelect
          :model-value="minutes || '00'"
          :display="minutes ? pad(minutes) : '00'"
          aria-label="Minutes"
          @update:model-value="emitTime({ minutes: $event })"
        >
          <NativeSelectOption v-for="option in minuteOptions" :key="option" :value="option">
            {{ option }}
          </NativeSelectOption>
        </PickerOverlaySelect>
        <template v-if="!minutePrecision">
          <span class="text-muted-foreground px-0.5 text-sm">:</span>
          <PickerOverlaySelect
            :model-value="seconds || '00'"
            :display="seconds ? pad(seconds) : '00'"
            aria-label="Seconds"
            @update:model-value="emitTime({ seconds: $event })"
          >
            <NativeSelectOption v-for="option in secondOptions" :key="option" :value="option">
              {{ option }}
            </NativeSelectOption>
          </PickerOverlaySelect>
        </template>
      </div>
    </PopoverContent>
  </Popover>
</template>
