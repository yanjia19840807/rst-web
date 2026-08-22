import { z } from 'zod'

import { SUPPORT_FREQUENCIES, SUPPORT_UOMS } from '../components/associated-data/supportOptions'
import type { SupportItem, SupportItemRequest } from '../types'

const FREQUENCY_CODES = SUPPORT_FREQUENCIES.map((item) => item.value)

export const supportItemFormSchema = z.object({
  categoryId: z.string().trim().min(1, 'Category is required.'),
  categoryName: z.string(),
  activity: z.string().trim().min(1, 'Activity is required.'),
  frequencyCode: z
    .string()
    .refine((value) => FREQUENCY_CODES.includes(value as (typeof FREQUENCY_CODES)[number]), {
      message: 'Select a frequency.',
    }),
  volume: z
    .union([z.number(), z.null()])
    .superRefine((value, ctx) => {
      if (value == null || !Number.isFinite(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Volume is required.',
        })
        return
      }
      if (value < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Volume must be zero or greater.',
        })
      }
    }),
  unitOfMeasure: z
    .string()
    .refine((value) => (SUPPORT_UOMS as readonly string[]).includes(value), {
      message: 'Select a unit of measure.',
    }),
  workloadPerUnitMinutes: z
    .union([z.number(), z.null()])
    .superRefine((value, ctx) => {
      if (value == null || !Number.isFinite(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Mins / unit is required.',
        })
        return
      }
      if (value < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Mins / unit must be zero or greater.',
        })
      }
    }),
  comments: z.string().max(500, 'Comments must be 500 characters or fewer.'),
})

export type SupportItemFormValues = z.input<typeof supportItemFormSchema>

export function emptySupportItemForm(
  categoryId = '',
  categoryName = '',
): SupportItemFormValues {
  return {
    categoryId,
    categoryName,
    activity: '',
    frequencyCode: 'MONTHLY',
    volume: null,
    unitOfMeasure: SUPPORT_UOMS[0],
    workloadPerUnitMinutes: null,
    comments: '',
  }
}

export function supportItemToForm(item: SupportItem): SupportItemFormValues {
  return {
    categoryId: item.categoryId ?? '',
    categoryName: item.category,
    activity: item.activity,
    frequencyCode: item.frequencyCode,
    volume: item.volume,
    unitOfMeasure: item.unitOfMeasure,
    workloadPerUnitMinutes: item.workloadPerUnitMinutes,
    comments: item.comments ?? '',
  }
}

export function toSupportItemRequest(values: SupportItemFormValues): SupportItemRequest {
  return {
    categoryId: values.categoryId,
    activity: values.activity.trim(),
    frequencyCode: values.frequencyCode,
    volume: Number(values.volume),
    unitOfMeasure: values.unitOfMeasure,
    workloadPerUnitMinutes: Number(values.workloadPerUnitMinutes),
    comments: values.comments.trim() || null,
  }
}
