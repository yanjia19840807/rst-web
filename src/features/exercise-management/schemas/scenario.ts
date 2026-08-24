import { z } from 'zod'

export type ShiftDraft = {
  shiftNo: number
  startTime: string
  /** Shift length in hours (Demo Excel “Shift Duration (hours)”). Persisted as minutes via API. */
  durationHours: number | null
  headcount: number | null
  worksOnWeekend: boolean
}

export function emptyShiftDraft(shiftNo = 1): ShiftDraft {
  return {
    shiftNo,
    startTime: '',
    durationHours: null,
    headcount: null,
    worksOnWeekend: false,
  }
}

export function isBlankShift(row: ShiftDraft) {
  return !row.startTime?.trim() && row.durationHours == null && row.headcount == null
}

export function toShiftRequests(rows: ShiftDraft[]) {
  return rows.filter((row) => !isBlankShift(row)).map((row, index) => ({
    shiftNo: index + 1,
    startTime: row.startTime.length === 5 ? `${row.startTime}:00` : row.startTime,
    durationMinutes: Number(row.durationHours) * 60,
    headcount: Number(row.headcount),
    worksOnWeekend: row.worksOnWeekend,
  }))
}

const shiftDraftSchema = z.object({
  shiftNo: z.number(),
  startTime: z.string(),
  durationHours: z.number().nullable(),
  headcount: z.number().nullable(),
  worksOnWeekend: z.boolean(),
})

function refineShifts(requireCompleteRows: boolean) {
  return (data: { shifts: ShiftDraft[] }, ctx: z.RefinementCtx) => {
    for (const [index, row] of data.shifts.entries()) {
      if (!requireCompleteRows && isBlankShift(row)) continue
      if (!row.startTime?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['shifts', index, 'startTime'],
          message: 'Start time is required.',
        })
      }
      if (row.durationHours == null || !Number.isFinite(row.durationHours) || row.durationHours <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['shifts', index, 'durationHours'],
          message: 'Duration (hours) must be a positive number.',
        })
      }
      if (row.headcount == null || !Number.isFinite(row.headcount) || row.headcount < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['shifts', index, 'headcount'],
          message: 'Capacity FTE must be zero or greater.',
        })
      }
    }
  }
}

const scenarioFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a scenario name.')
    .max(200, 'Name must be 200 characters or fewer.'),
  description: z
    .union([z.string(), z.null()])
    .transform((value) => value ?? ''),
  rightSizingHc: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    z
      .number({
        required_error: 'Right Sizing HC must be a number.',
        invalid_type_error: 'Right Sizing HC must be a number.',
      })
      .min(0, 'Right Sizing HC must be zero or greater.'),
  ),
  shifts: z.array(shiftDraftSchema),
})

/** Save: name required; filled shifts must be complete; blank shift rows are ignored. */
export const scenarioFormSchema = scenarioFieldsSchema.superRefine(refineShifts(false))

/** Slot run: every displayed shift row must be complete (the form always has one). */
export const scenarioSlotSchema = scenarioFieldsSchema.superRefine(refineShifts(true))

export type ScenarioFormValues = z.input<typeof scenarioFieldsSchema>

export function emptyScenarioForm(): ScenarioFormValues {
  return {
    name: '',
    description: '',
    rightSizingHc: 0,
    shifts: [emptyShiftDraft()],
  }
}

export const scenarioMetadataSchema = scenarioFieldsSchema.pick({
  name: true,
  description: true,
})

export type ScenarioMetadataValues = z.infer<typeof scenarioMetadataSchema>

export function emptyScenarioMetadata(): ScenarioMetadataValues {
  return {
    name: '',
    description: '',
  }
}
