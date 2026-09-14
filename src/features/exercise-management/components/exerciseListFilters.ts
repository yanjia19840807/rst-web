import type { CurrentStepFilter } from '../workflowLabels'

export type ExerciseListFilterValues = {
  exerciseCode: string
  pl3: string
  toolkit: string
  reviewStage: CurrentStepFilter
  finalStatus: string
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
    reviewStage: 'All stages',
    finalStatus: 'All statuses',
    reviewer: '',
    submittedFrom: '',
    submittedTo: '',
    archivedFrom: '',
    archivedTo: '',
  }
}
