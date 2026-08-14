import { z } from 'zod'

/** Create/update scenario metadata (name + description). */
export const scenarioMetadataSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a scenario name.')
    .max(200, 'Name must be 200 characters or fewer.'),
  description: z
    .union([z.string(), z.null()])
    .transform((value) => value ?? ''),
})

export type ScenarioMetadataValues = z.infer<typeof scenarioMetadataSchema>

export function emptyScenarioMetadata(): ScenarioMetadataValues {
  return {
    name: '',
    description: '',
  }
}
