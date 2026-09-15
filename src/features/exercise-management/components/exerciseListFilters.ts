import type { CurrentStepFilter } from '../workflowLabels'

export type ExerciseListFilterValues = {
  exerciseCode: string
  pl3: string
  toolkit: string
  sizingMonth: string
  reviewStage: CurrentStepFilter
  reviewer: string
  submittedFrom: string
  submittedTo: string
  archivedFrom: string
  archivedTo: string
}

export function emptyExerciseListFilters(): ExerciseListFilterValues {
  return {
    exerciseCode: '',
    pl3: '',
    toolkit: 'All toolkits',
    sizingMonth: '',
    reviewStage: 'All stages',
    reviewer: '',
    submittedFrom: '',
    submittedTo: '',
    archivedFrom: '',
    archivedTo: '',
  }
}
