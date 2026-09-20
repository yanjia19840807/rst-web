import type { CurrentStepFilter } from '../workflowLabels'

export type ExerciseListFilterValues = {
  exerciseCode: string
  toolkit: string
  sizingMonth: string
  submittedFrom: string
  submittedTo: string
  archivedFrom: string
  archivedTo: string
  center: string
  domain: string
  pl3: string
  carrier: string
  site: string
  customerCountry: string
  reviewStage: CurrentStepFilter
  reviewer: string
}

export function emptyExerciseListFilters(): ExerciseListFilterValues {
  return {
    exerciseCode: '',
    toolkit: '',
    sizingMonth: '',
    submittedFrom: '',
    submittedTo: '',
    archivedFrom: '',
    archivedTo: '',
    center: '',
    domain: '',
    pl3: '',
    carrier: '',
    site: '',
    customerCountry: '',
    reviewStage: '',
    reviewer: '',
  }
}
