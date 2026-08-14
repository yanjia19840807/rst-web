import { z } from 'zod'

export const toolkitSubtaskSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Enter a subtask name.').max(200),
  // API stores blank descriptions as null.
  description: z
    .union([z.string(), z.null()])
    .transform((value) => value ?? ''),
  displayOrder: z.number().min(0),
  deletedAt: z.string().nullable(),
})

export const sharedKpiKeySchema = z.object({
  carrier: z.string().min(1),
  site: z.string().min(1),
  customerCountry: z.string().min(1),
})

export const toolkitEditorSchema = z.object({
  name: z.string().trim().min(1, 'Enter a toolkit name.').max(200, 'Name must be 200 characters or fewer.'),
  description: z
    .union([z.string(), z.null()])
    .transform((value) => value ?? ''),
  supervisorPositionId: z.string().min(1, 'Select Process Level 3.'),
  center: z.string().min(1, 'Select a GBS Center.'),
  domain: z.string().min(1, 'Select a Domain.'),
  pl1: z.string().min(1, 'Select Process Level 1.'),
  pl2: z.string().min(1, 'Select Process Level 2.'),
  pl3Code: z.string().min(1, 'Select Process Level 3.'),
  pl3Name: z.string().min(1, 'Select Process Level 3.'),
  combineSubtasksTime: z.boolean(),
  subtasks: z.array(toolkitSubtaskSchema),
  sharedKpiSelections: z
    .array(sharedKpiKeySchema)
    .min(1, 'Select at least one Shared KPI line.'),
  version: z.number().optional(),
})

export type ToolkitFormValues = z.infer<typeof toolkitEditorSchema>

export function emptyToolkitForm(center = ''): ToolkitFormValues {
  return {
    name: '',
    description: '',
    supervisorPositionId: '',
    center,
    domain: '',
    pl1: '',
    pl2: '',
    pl3Code: '',
    pl3Name: '',
    combineSubtasksTime: false,
    subtasks: [],
    sharedKpiSelections: [],
    version: undefined,
  }
}
